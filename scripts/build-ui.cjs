const esbuild=require('esbuild'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
(async()=>{
    const localePlugin={name:'compact-korean-catalog',setup(build){build.onLoad({filter:/ko-KR\.json$/},args=>{const catalog=JSON.parse(fs.readFileSync(args.path,'utf8'));return {loader:'json',contents:JSON.stringify(Object.fromEntries(Object.entries(catalog).map(([key,entry])=>[key,entry.defaultMessage])))};});}};
    const result=await esbuild.build({plugins:[localePlugin],entryPoints:['src/ui/astryx-controls.jsx'],bundle:true,minify:true,format:'iife',target:['es2022'],outfile:'astryx-ui.js',define:{'process.env.NODE_ENV':'"production"'},legalComments:'linked',metafile:true});
    const licenses=new Map();
    for(const input of Object.keys(result.metafile.inputs).filter(file=>file.startsWith('node_modules/'))){
        let dir=path.dirname(input);
        while(dir!=='.'&&!fs.existsSync(path.join(dir,'package.json')))dir=path.dirname(dir);
        if(dir==='.')continue;
        const pkg=JSON.parse(fs.readFileSync(path.join(dir,'package.json'),'utf8'));
        if(licenses.has(pkg.name))continue;
        const licenseFile=fs.readdirSync(dir).find(file=>/^licen[sc]e(?:\.|$)/i.test(file));
        const text=licenseFile?fs.readFileSync(path.join(dir,licenseFile),'utf8'):pkg.name==='@astryxdesign/core'?fs.readFileSync('licenses/astryx-MIT.txt','utf8'):pkg.name==='@stylexjs/stylex'?fs.readFileSync('licenses/stylex-MIT.txt','utf8'):null;
        if(!text)throw Error('Missing third-party license: '+pkg.name);
        licenses.set(pkg.name,`${pkg.name}@${pkg.version}\n${text}`);
    }
    fs.writeFileSync('third-party-notices.txt',[...licenses].sort(([a],[b])=>a.localeCompare(b)).map(([,text])=>text).join('\n\n'));
    for(const file of ['astryx-ui.js','astryx-ui.css']){const data=fs.readFileSync(file);console.log(file+': '+data.length+' bytes, '+zlib.gzipSync(data).length+' gzip');}
})().catch(error=>{console.error(error);process.exitCode=1});
