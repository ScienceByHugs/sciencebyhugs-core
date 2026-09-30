const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript')
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8')
const compile=s=>ts.transpileModule(s.replace(/^import .*$/gm,''),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
function helpers(){const ctx={exports:{},setTimeout:fn=>{fn();return 1}};vm.runInNewContext(compile(read('supabase/functions/core-dashboard/read-retry.ts')),ctx);return ctx.exports}
function frontend(sequence){const ctx={exports:{},Response,Error,setTimeout:fn=>{fn();return 1},supabase:{functions:{async invoke(){ctx.calls++;return sequence[Math.min(ctx.calls-1,sequence.length-1)]}}},calls:0};vm.runInNewContext(compile(read('src/services/dashboard.ts')),ctx);return ctx}
const http=(status,payload)=>({data:null,error:{context:new Response(JSON.stringify(payload),{status})}})
test('dashboard automatically recovers from transient server or network failures',async()=>{
 for(const error of [http(500,{error:'Temporary failure'}),{data:null,error:{name:'FunctionsFetchError'}}]){
  const ctx=frontend([error,{data:{success:true},error:null}]);await ctx.exports.loadCoreDashboard();assert.equal(ctx.calls,2)
 }
})
test('dashboard does not retry rejected sessions, forbidden users, or permanent errors',async()=>{
 for(const response of [http(401,{}),http(403,{}),http(500,{error:'Missing column',retryable:false})]){
  const ctx=frontend([response]);await assert.rejects(ctx.exports.loadCoreDashboard());assert.equal(ctx.calls,1)
 }
})
test('persistent failures stop after three attempts and show the server message',async()=>{
 const ctx=frontend([http(503,{error:'Temporarily unavailable'})]);await assert.rejects(ctx.exports.loadCoreDashboard(),/Temporarily unavailable/);assert.equal(ctx.calls,3)
})
test('server read retries recover credential timing failures but reject permission failures',async()=>{
 const h=helpers();let count=0
 const result=await h.readWithRetry(async()=>{count++;return count===1?{error:{code:'PGRST303'},status:401}:{data:[],error:null,status:200}})
 assert.equal(count,2);assert.equal(result.error,null)
 count=0;await h.readWithRetry(async()=>{count++;return {error:{code:'42501'},status:401}});assert.equal(count,1)
 count=0;await h.readWithRetry(async()=>{count++;return {error:{code:'PGRST303'},status:401}});assert.equal(count,3)
})
function worker(user,failSync=false){
 const calls={},clients=[];let handler;const h=helpers()
 const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEYS:'{"default":"publishable"}',SUPABASE_SECRET_KEYS:'{"default":"modern-secret"}',SUPABASE_SERVICE_ROLE_KEY:'stable-service-key'}
 const ctx={exports:{},Request,Response,Date,Map,Number,console:{error(){}},...h,Deno:{env:{get:key=>env[key]},serve:fn=>{handler=fn}},createClient(url,key){clients.push(key);if(key==='publishable')return {auth:{async getUser(){return {data:{user},error:null}}}};return {from(table){const builder={select(){return this},order(){return this},limit(){return this},then(resolve){calls[table]=(calls[table]||0)+1;const transient=failSync&&table==='catalog_sync_runs'&&calls[table]===1;return Promise.resolve(transient?{error:{code:'PGRST303'},status:401,data:null}:{error:null,status:200,data:[]}).then(resolve)}};return builder}}}}
 vm.runInNewContext(compile(read('supabase/functions/core-dashboard/index.ts')),ctx)
 return {calls,clients,invoke:()=>handler(new Request('https://example.test',{method:'POST',headers:{Authorization:'Bearer valid-session'}})),handler:()=>handler}
}
test('dashboard preserves real-user admin checks and never trusts editable metadata',async()=>{
 const w=worker({app_metadata:{},user_metadata:{role:'owner'}});assert.equal((await w.invoke()).status,403);assert.equal(Object.keys(w.calls).length,0)
 const missing=await w.handler()(new Request('https://example.test',{method:'POST'}));assert.equal(missing.status,401)
})
test('authorized dashboard uses stable server credentials and recovers a failed sync read',async()=>{
 const w=worker({app_metadata:{role:'owner'}},true);const response=await w.invoke();assert.equal(response.status,200);assert.equal((await response.json()).success,true);assert.equal(w.calls.catalog_sync_runs,2);assert.equal(w.calls.orders,1);assert.ok(w.clients.includes('stable-service-key'));assert.ok(!w.clients.includes('modern-secret'))
})
