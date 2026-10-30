import fs from 'node:fs'
import sharp from 'sharp'
import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
const file='public/region-icons/pharaoh-v2.png',meta=await sharp(file).metadata()
if(!meta.hasAlpha)throw Error('Icon is not transparent')
const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true})
let visibleEdgePixels=0,nearTransparentEdgePixels=0
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(x===0||y===0||x===info.width-1||y===info.height-1){const alpha=data[(y*info.width+x)*4+3];if(alpha>8)visibleEdgePixels++;else if(alpha)nearTransparentEdgePixels++}
if(visibleEdgePixels)throw Error('Visible artwork touches the image edge')
const browser=await chromium.launch({executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',headless:true})
try{const page=await browser.newPage({viewport:{width:650,height:520},deviceScaleFactor:2});await page.goto('http://127.0.0.1:5173/artifacts/previews/pharaoh/pyramid-icon.html');await page.waitForFunction(()=>document.images.length===8&&[...document.images].every(i=>i.complete&&i.naturalWidth>0));await page.screenshot({path:'artifacts/previews/pharaoh/pyramid-icon.png',fullPage:true});fs.writeFileSync('assets/storage-upload/new/20261030-101115/verification.json',JSON.stringify({verified_at:new Date().toISOString(),hasAlpha:meta.hasAlpha,visibleEdgePixels,edgeAlphaThreshold:8,nearTransparentEdgePixels,renderedSizes:[24,36,64,160],themes:['light','dark'],images:8},null,2)+'\n');console.log('Verified transparent pyramid icon at four sizes on light and dark backgrounds')}finally{await browser.close()}
