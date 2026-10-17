import {loadEnvFile} from 'node:process'
import {readFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'
loadEnvFile('.env.storage.local')
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
for(const path of ['decorations/normal/broadleaf-water-fern_sprite.png','decorations/rare/giant-fan-water-fern_sprite.png']){
 const {error}=await client.storage.from('collectibles').upload(path,readFileSync('assets/storage-upload/new/20261017-135100/'+path),{upsert:true,contentType:'image/png'})
 if(error)throw new Error('Plant upload failed: '+(error.statusCode??'unknown'))
 console.log('Updated '+path)
}
