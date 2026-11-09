'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const {createHash} = require('node:crypto');

async function checkSkills(root = path.resolve(__dirname, '..')) {
    const lock = JSON.parse(await fs.readFile(path.join(root, '.agents/skills-lock.json'), 'utf8'));
    if (lock.version !== 1 || lock.scope !== 'project' || !Array.isArray(lock.skills)) throw Error('Invalid project skill lock');
    let checked = 0;
    const names = new Set();
    for (const skill of lock.skills) {
        if (!/^[a-z0-9-]+$/.test(skill.name) || names.has(skill.name) || !/^[a-f0-9]{40}$/.test(skill.commit)) throw Error('Invalid or duplicate skill identity');
        names.add(skill.name);
        const directory = path.join(root, '.agents/skills', skill.name);
        const expected = new Set(Object.keys(skill.files));
        for (const relative of expected) {
            const parts = relative.split('/');
            if (path.isAbsolute(relative) || parts.some(part => !part || part === '.' || part === '..')) throw Error('Invalid locked skill path');
            let target = directory;
            if ((await fs.lstat(target)).isSymbolicLink()) throw Error('Skill directory must not be a symlink');
            for (const part of parts) {
                target = path.join(target, part);
                if ((await fs.lstat(target)).isSymbolicLink()) throw Error('Skill files must not be symlinks');
            }
            if (!(await fs.stat(target)).isFile()) throw Error('Locked skill entry must be a regular file');
            const digest = createHash('sha256').update(await fs.readFile(target)).digest('hex');
            if (digest !== skill.files[relative]) throw Error('Skill integrity mismatch: ' + skill.name + '/' + relative);
            checked++;
        }
        async function walk(folder) {
            for (const entry of await fs.readdir(folder, {withFileTypes:true})) {
                const target = path.join(folder, entry.name);
                if (entry.isSymbolicLink()) throw Error('Unexpected skill symlink');
                if (entry.isDirectory()) await walk(target);
                else if (!expected.has(path.relative(directory, target).split(path.sep).join('/'))) throw Error('Unreviewed skill file: ' + skill.name + '/' + entry.name);
            }
        }
        await walk(directory);
    }
    return {ok:true, skills:names.size, files:checked, hooksInstalled:lock.hooksInstalled, globalConfigChanged:lock.globalConfigChanged};
}
if (require.main === module) checkSkills().then(result => console.log(JSON.stringify(result, null, 2))).catch(error => {console.error(error.message); process.exitCode=1;});
module.exports = {checkSkills};
