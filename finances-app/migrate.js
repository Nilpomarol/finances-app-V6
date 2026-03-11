import fs from 'fs';
import { randomUUID } from 'crypto';

// --- CONFIGURACIÓ ---
// IMPORTANT: Posa aquí el teu user_id (UUID) real de la base de dades V6
const USER_ID = "usr_701e78a629ca02a4";
const INPUT_FILE = 'C:/Users/nilpo/Downloads/finance_backup_2026-03-11.json';
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
    `BEGIN TRANSACTION;`,
    `\n-- ESBORRAR TOTES LES DADES EXISTENTS (ordre invers de dependències)`,
    `DELETE FROM transaction_splits;`,
    `DELETE FROM transactions;`,
    `DELETE FROM people;`,
    `DELETE FROM events;`,
    `DELETE FROM categories;`,
    `DELETE FROM accounts;`,
];

const ac = (str) => str ? `'${str.replace(/'/g, "''")}'` : 'NULL';
const r2 = (n) => Math.round(n * 100) / 100;
const now = Date.now();


// 1. MIGRAR COMPTES
sqlStatements.push(`\n-- COMPTES`);
oldDb.accounts.forEach(acc => {
    // Saltem comptes interns/virtuals — en V6 no existeixen, les seves
    // transaccions quedaran amb compte_id = NULL
    if (acc.type === 'shared' || acc.type === 'system') {
        console.log(`  Saltant compte intern: "${acc.name}" (${acc.type})`);
        return;
    }

    const newId = randomUUID();
    accountMap[acc.id] = newId;

    let tipus = acc.type;
    if (tipus === 'estalvis') tipus = 'estalvi';

    let logo = acc.icon ? ac(acc.icon) : "'wallet'";
    let color = acc.color ? ac(acc.color) : "'#94a3b8'";

    sqlStatements.push(
        `INSERT INTO accounts (id, user_id, nom, tipus, logo, color, saldo, data_modificacio, eliminat) ` +
        `VALUES ('${newId}', '${USER_ID}', ${ac(acc.name)}, '${tipus}', ${logo}, ${color}, ${r2(acc.balance)}, ${now}, false);`
    );
});

// 1b. SALDOS INICIALS
// V6 recalcula el saldo d'un compte sumant totes les transaccions.
// Si el compte tenia saldo abans de la primera transacció registrada,
// inserim una transacció sintètica "Saldo inicial" perquè el càlcul quadri.
sqlStatements.push(`\n-- SALDOS INICIALS DE COMPTES`);
const accountNetMap = {};
oldDb.transactions.forEach(t => {
    accountNetMap[t.account_id] = (accountNetMap[t.account_id] || 0) + t.amount;
});
const OPENING_DATE = new Date('2000-01-01').getTime();
oldDb.accounts.forEach(acc => {
    if (!accountMap[acc.id]) return; // compte intern/virtual, saltat
    const net = r2(accountNetMap[acc.id] || 0);
    const bal = r2(acc.balance);
    const diff = r2(bal - net);
    if (Math.abs(diff) < 0.01) return;
    const txId = randomUUID();
    const tipus = diff > 0 ? 'ingres' : 'despesa';
    const importVal = r2(Math.abs(diff));
    sqlStatements.push(
        `INSERT INTO transactions (id, user_id, concepte, data, import_trs, notes, compte_id, compte_desti_id, categoria_id, esdeveniment_id, event_tag_id, tipus, recurrent, liquidacio_persona_id, pagat_per_id, data_modificacio, eliminat) ` +
        `VALUES ('${txId}', '${USER_ID}', 'Saldo inicial', ${OPENING_DATE}, ${importVal}, NULL, '${accountMap[acc.id]}', NULL, NULL, NULL, NULL, '${tipus}', false, NULL, NULL, ${now}, false);`
    );
    console.log(`  Saldo inicial per a "${acc.name}": ${diff > 0 ? '+' : ''}${diff}`);
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
    let importTrs = r2(Math.abs(t.amount));
    let tipus = t.amount < 0 ? 'despesa' : 'ingres';

    let compteId = accountMap[t.account_id] ? `'${accountMap[t.account_id]}'` : 'NULL';
    let compteDestiId = 'NULL';
    let catId = t.category_id ? `'${categoryMap[t.category_id]}'` : 'NULL';
    let evId = t.event_id ? `'${eventMap[t.event_id]}'` : 'NULL';
    let liquidacioId = t.is_settlement ? `'${personMap[t.linked_person_id]}'` : 'NULL';

    // pagat_per_id: quan recoverable_amount < 0, la persona vinculada va pagar per l'usuari
    let pagatPerId = 'NULL';
    if (t.recoverable_amount < 0 && t.linked_person_id != null && personMap[t.linked_person_id]) {
        pagatPerId = `'${personMap[t.linked_person_id]}'`;
    }

    // Gestió especial per a Transferències (Ajuntar 2 en 1)
    if (t.is_transfer) {
        tipus = 'transferencia';
        catId = 'NULL';
        const match = oldDb.transactions.find(tx =>
            tx.is_transfer && tx.date === t.date && tx.amount === -t.amount && tx.id !== t.id
        );

        if (match) {
            processedTransfers.add(match.id);
            if (t.amount < 0) {
                compteId = accountMap[t.account_id] ? `'${accountMap[t.account_id]}'` : 'NULL';
                compteDestiId = accountMap[match.account_id] ? `'${accountMap[match.account_id]}'` : 'NULL';
            } else {
                compteId = accountMap[match.account_id] ? `'${accountMap[match.account_id]}'` : 'NULL';
                compteDestiId = accountMap[t.account_id] ? `'${accountMap[t.account_id]}'` : 'NULL';
            }
        }
    }

    // Inserir la transacció principal
    sqlStatements.push(
        `INSERT INTO transactions (id, user_id, concepte, data, import_trs, notes, compte_id, compte_desti_id, categoria_id, esdeveniment_id, event_tag_id, tipus, recurrent, liquidacio_persona_id, pagat_per_id, data_modificacio, eliminat) ` +
        `VALUES ('${txId}', '${USER_ID}', ${ac(t.payee)}, ${dataTs}, ${importTrs}, ${ac(t.note)}, ${compteId}, ${compteDestiId}, ${catId}, ${evId}, NULL, '${tipus}', false, ${liquidacioId}, ${pagatPerId}, ${now}, false);`
    );

    // Gestió de Deutes (Splits)
    // Només per a despeses compartides positives (l'usuari va pagar i recupera diners)
    if (t.recoverable_amount > 0 && !t.is_settlement) {
        const splitId = randomUUID();
        sqlStatements.push(
            `INSERT INTO transaction_splits (id, transaccio_id, persona_id, import_degut, data_modificacio, eliminat) ` +
            `VALUES ('${splitId}', '${txId}', '${personMap[t.linked_person_id]}', ${r2(t.recoverable_amount)}, ${now}, false);`
        );
    }
});


sqlStatements.push(`\nCOMMIT;`);

fs.writeFileSync(OUTPUT_FILE, sqlStatements.join('\n'));
console.log(`\nMigració completada! S'ha generat el fitxer ${OUTPUT_FILE}`);
