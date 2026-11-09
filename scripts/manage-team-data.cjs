'use strict';
const path=require('node:path');
const {audit,sync}=require('../server/team-data.cjs');
const {writeJsonAtomic}=require('../server/snapshot-store.cjs');
async function main(command=process.argv[2]||'audit'){
    if(!['audit','sync'].includes(command))throw Error('Use audit or sync');
    const directory=path.resolve(__dirname,'../data');
    const result=command==='sync'?await sync(directory):null;
    const report=result?.report||await audit(directory);
    const reportPath=path.resolve(__dirname,'../.sporton/data-audit.json');
    await writeJsonAtomic(reportPath,report);
    const byCode={};for(const issue of report.issues)byCode[issue.code]=(byCode[issue.code]||0)+1;
    console.log(JSON.stringify({schemaValid:report.ok,identityComplete:report.identityComplete,externalAccuracyVerified:false,counts:report.counts,issues:byCode,...(result?{changed:result.changed,teams:result.catalog.teams.length,recordCoverage:result.catalog.recordCoverage}:{}),reportPath},null,2));
    if(!report.ok)process.exitCode=1;
}
if(require.main===module)main().catch(async error=>{console.error(error.message);process.exitCode=1;try{await writeJsonAtomic(path.resolve(__dirname,'../.sporton/data-audit.json'),{checkedAt:new Date().toISOString(),ok:false,error:error.message});}catch(reportError){console.error('Audit report could not be written: '+reportError.message);}});
module.exports={main};
