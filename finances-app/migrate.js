import fs from 'fs';
import { randomUUID } from 'crypto';

// --- CONFIGURACIÓ ---
// IMPORTANT: Posa aquí el teu user_id (UUID) real de la base de dades V6
const USER_ID = "usr_701e78a629ca02a4"; 
const INPUT_FILE = './finance_backup_2026-03-06.json';
const OUTPUT_FILE = './migracio.sql';

// Llegim el JSON
const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
const oldDb = JSON.parse(rawData).data;

// Mapes per traduir IDs antics (enters) als nous UUIDs (strings)
const accountMap = {};
const categoryMap = {};
const personMap = {};
const eventMap = {};

let sqlStatements = [
    `-- Script de Migració Finances V6`,
    `-- Generat automàticament\n`,
    `BEGIN TRANSACTION;`
];

const ac = (str) => str ? `'${str.replace(/'/g, "''")}'` : 'NULL';
const now = Date.now();


// 1. MIGRAR COMPTES
sqlStatements.push(`\n-- COMPTES`);
oldDb.accounts.forEach(acc => {
    const newId = randomUUID();
    accountMap[acc.id] = newId;
    
    // SOLUCIÓ 2: Mapeig estricte dels tipus de compte per complir el CHECK
    let tipus = acc.type;
    if (tipus === 'estalvis') tipus = 'estalvi';
    if (tipus === 'shared' || tipus === 'system') tipus = 'banc'; // Forcem a 'banc' els comptes interns
    
    // Valors per defecte si el compte antic no té logo o color
    let logo = acc.icon ? ac(acc.icon) : "'wallet'";
    let color = acc.color ? ac(acc.color) : "'#94a3b8'";
    
    sqlStatements.push(
        `INSERT INTO accounts (id, user_id, nom, tipus, logo, color, saldo, data_modificacio, eliminat) ` +
        `VALUES ('${newId}', '${USER_ID}', ${ac(acc.name)}, '${tipus}', ${logo}, ${color}, ${acc.balance}, ${now}, false);`
    );
});
// 2. MIGRAR CATEGORIES
sqlStatements.push(`\n-- CATEGORIES`);
oldDb.categories.forEach(cat => {
    const newId = randomUUID();
    categoryMap[cat.id] = newId;
    let tipus = cat.type === 'expense' ? 'despesa' : 'ingres';
    sqlStatements.push(
        `INSERT INTO categories (id, user_id, nom, tipus, pressupost_mensual, color, icona, data_modificacio, eliminat) ` +
        `VALUES ('${newId}', '${USER_ID}', ${ac(cat.name)}, '${tipus}', ${cat.budget_limit || 'NULL'}, ${ac(cat.color)}, ${ac(cat.icon)}, ${now}, false);`
    );
});

// 3. MIGRAR PERSONES
sqlStatements.push(`\n-- PERSONES`);
oldDb.people.forEach(p => {
    const newId = randomUUID();
    personMap[p.id] = newId;
    let amagat = p.is_hidden ? 'true' : 'false';
    sqlStatements.push(
        `INSERT INTO people (id, user_id, nom, saldo_caixejat, amagat, data_modificacio, eliminat) ` +
        `VALUES ('${newId}', '${USER_ID}', ${ac(p.name)}, 0, ${amagat}, ${now}, false);`
    );
});

// 4. MIGRAR ESDEVENIMENTS
sqlStatements.push(`\n-- ESDEVENIMENTS`);
oldDb.events.forEach(e => {
    const newId = randomUUID();
    eventMap[e.id] = newId;
    const iniciTs = new Date(e.start_date).getTime();
    const fiTs = new Date(e.end_date).getTime();
    sqlStatements.push(
        `INSERT INTO events (id, user_id, nom, tipus, data_inici, data_fi, data_modificacio, eliminat) ` +
        `VALUES ('${newId}', '${USER_ID}', ${ac(e.name)}, 'viatge', ${iniciTs}, ${fiTs}, ${now}, false);`
    );
});

// 5. MIGRAR TRANSACCIONS I DEUTES (SPLITS)
sqlStatements.push(`\n-- TRANSACCIONS I DEUTES`);
const processedTransfers = new Set();

oldDb.transactions.forEach(t => {
    if (processedTransfers.has(t.id)) return;

    const txId = randomUUID();
    const dataTs = new Date(t.date).getTime();
    let importTrs = Math.abs(t.amount);
    let tipus = t.amount < 0 ? 'despesa' : 'ingres';
    
    let compteId = accountMap[t.account_id];
    let compteDestiId = 'NULL';
    let catId = t.category_id ? `'${categoryMap[t.category_id]}'` : 'NULL';
    let evId = t.event_id ? `'${eventMap[t.event_id]}'` : 'NULL';
    let liquidacioId = t.is_settlement ? `'${personMap[t.linked_person_id]}'` : 'NULL';

    // Gestió especial per a Transferències (Ajuntar 2 en 1)
    if (t.is_transfer) {
        tipus = 'transferencia';
        catId = 'NULL';
        const match = oldDb.transactions.find(tx => 
            tx.is_transfer && tx.date === t.date && tx.amount === -t.amount && tx.id !== t.id
        );
        
        if (match) {
            processedTransfers.add(match.id); // Marquem la parella com a processada
            if (t.amount < 0) {
                compteId = accountMap[t.account_id];
                compteDestiId = `'${accountMap[match.account_id]}'`;
            } else {
                compteId = accountMap[match.account_id];
                compteDestiId = `'${accountMap[t.account_id]}'`;
            }
        }
    }

    // Inserir la transacció principal
    sqlStatements.push(
        `INSERT INTO transactions (id, user_id, concepte, data, import_trs, notes, compte_id, compte_desti_id, categoria_id, esdeveniment_id, event_tag_id, tipus, recurrent, liquidacio_persona_id, data_modificacio, eliminat) ` +
        `VALUES ('${txId}', '${USER_ID}', ${ac(t.payee)}, ${dataTs}, ${importTrs}, ${ac(t.note)}, '${compteId}', ${compteDestiId}, ${catId}, ${evId}, NULL, '${tipus}', false, ${liquidacioId}, ${now}, false);`
    );

    // Gestió de Deutes (Splits)
    if (t.recoverable_amount > 0 && !t.is_settlement) {
        // Despesa compartida normal: només creem split si NO és una liquidació
        const splitId = randomUUID();
        sqlStatements.push(
            `INSERT INTO transaction_splits (id, transaccio_id, persona_id, import_degut, data_modificacio, eliminat) ` +
            `VALUES ('${splitId}', '${txId}', '${personMap[t.linked_person_id]}', ${t.recoverable_amount}, ${now}, false);`
        );
    }
});


sqlStatements.push(`\nCOMMIT;`);

fs.writeFileSync(OUTPUT_FILE, sqlStatements.join('\n'));
console.log(`Migració completada! S'ha generat el fitxer ${OUTPUT_FILE}`);