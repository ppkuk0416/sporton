const {spawnSync}=require('node:child_process'),fs=require('node:fs'),vm=require('node:vm');
const files=fs.readdirSync('.').filter(p=>p.endsWith('.js')).concat(fs.readdirSync('server').filter(p=>p.endsWith('.cjs')).map(p=>'server/'+p));
for(const file of files){try{new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});}catch(e){console.error(e);process.exit(1);}}
const tests=fs.readdirSync('tests').filter(p=>p.endsWith('.test.cjs')).map(p=>'tests/'+p);
let result;for(let attempt=0;attempt<3;attempt++){result=spawnSync(process.execPath,['--test',...tests],{stdio:'inherit'});if(result.error?.code!=='EBUSY')break;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100);}
if(result.error)console.error(result.error.message);process.exit(result.status===null?1:result.status);
