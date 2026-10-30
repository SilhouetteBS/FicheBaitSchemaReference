import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { preview, loadEnv } from 'vite';
import { chromium } from 'playwright';
const base='C:/Users/BlakeSmith/source/repos';
const specs=[['schema-reference','Laserfiche Data Dictionary','**/data/forms/versions.json'],['error-helper','Laserfiche Error Helper','**/assets/catalogIndex-*.js'],['forms-api-reference','Laserfiche Forms API/site-sentry-rollout','**/content.json']];
const live=process.env.SENTRY_ROLLOUT_LIVE==='true';
const browser=await chromium.launch({headless:true});
const results=[];
try {
for(const [site,folder,fault] of specs){
 const root=path.join(base,folder);const env=loadEnv('production',root,'VITE_');const origin=new URL(env.VITE_SENTRY_DSN).origin;
 assert.equal(env.VITE_SENTRY_ENVIRONMENT,'production'); assert.equal(env.VITE_SENTRY_ENABLED,'true');
 const server=await preview({root,configFile:false,preview:{host:'127.0.0.1',port:0,strictPort:true}});const url='http://127.0.0.1:'+server.httpServer.address().port;
 const context=await browser.newContext();const page=await context.newPage();const sent=[];const errors=[];page.on('pageerror',e=>errors.push(e));
 try {
 await page.route(origin+'/**',r=>r.abort());
 await page.goto(url,{waitUntil:'networkidle'});
 assert.match(await page.title(),/FicheBait/);assert.equal(errors.length,0,'Normal app must render without runtime errors');
 if(site==='schema-reference'){await page.getByRole('button',{name:'Diagram',exact:true}).click(); await page.locator('.diagram-stage').waitFor({timeout:10000}).catch(()=>page.locator('svg').first().waitFor());}
 if(site==='forms-api-reference'){await page.locator('#search-open').click();await page.locator('#search-input').fill('lookup');await page.locator('#search-results a').first().waitFor();await page.locator('#search-close').click();await page.locator('#endpoint-nav a').first().click();await page.locator('#view h1').waitFor();}
 await fs.mkdir(path.join(root,'tmp/sentry-rollout'),{recursive:true});await page.screenshot({path:path.join(root,'tmp/sentry-rollout/normal.png')});
 await page.unroute(origin+'/**');
 await page.route(origin+'/**',async route=>{
  const request=route.request(),body=request.postData();assert.doesNotMatch(body,/SYNTHETIC_PRIVATE_SEARCH/);const event=JSON.parse(body.split('\n')[2]);
  assert.equal(event.environment,'production');assert.equal(event.release,env.VITE_SENTRY_RELEASE);assert.equal(event.tags.site,site);
  for(const field of ['user','request','extra','contexts','message','transaction','server_name'])assert.equal(event[field],undefined);
  const headers=await request.allHeaders();assert.equal(headers.referer,undefined);assert.equal(headers.cookie,undefined);assert.ok(event.debug_meta?.images.length,'Original asset debug IDs retained');assert.equal(sent.length,0,'Only one controlled event per site');sent.push(event);
  if(live)await route.continue();else await route.fulfill({status:200,body:'{}',headers:{'access-control-allow-origin':'*'}});
 });
 await page.route(fault,async route=>{
  if(site==='error-helper'){const response=await route.fetch();const body=await response.text();assert.match(body,/export\{\w+ as catalogIndex\}/);await route.fulfill({response,body:body.replace(/export\{\w+ as catalogIndex\}/,'const brokenCatalog={};export{brokenCatalog as catalogIndex}')});}
  else await route.fulfill({status:503,body:'SYNTHETIC_PRIVATE_SEARCH'});
 });
 const accepted=page.waitForResponse(r=>r.url().startsWith(origin),{timeout:20000});await page.goto(url+'/?q=SYNTHETIC_PRIVATE_SEARCH',{waitUntil:'networkidle'});const response=await accepted;assert.equal(response.status(),200);await page.waitForTimeout(700);assert.equal(sent.length,1);
 results.push({site,live,eventId:sent[0].event_id,release:sent[0].release,operation:sent[0].tags.operation});
 const files=await fs.readdir(path.join(root,'dist/assets'));assert.ok(!files.some(f=>f.endsWith('.map')));
 console.log('PASS '+site+' normal browser, interactions, privacy and '+(live?'live ingestion':'intercepted delivery'));
 }finally {await context.close();await new Promise(r=>server.httpServer.close(r));}
}
}finally {await browser.close();}
console.log(JSON.stringify(results,null,2));
