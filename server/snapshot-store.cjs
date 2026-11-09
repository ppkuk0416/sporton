'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

async function writeJsonAtomic(target, value) {
    await fs.mkdir(path.dirname(target), {recursive:true});
    const temporary = target + '.' + randomUUID() + '.tmp';
    try {
        await fs.writeFile(temporary, JSON.stringify(value) + '\n', {flag:'wx'});
        await fs.rename(temporary, target);
    } finally {
        await fs.rm(temporary, {force:true});
    }
}
module.exports = { writeJsonAtomic };
