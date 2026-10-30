import React from 'react'
import {createRoot} from 'react-dom/client'
import {NoticeBody} from '@/features/notices/notice-body'
import type {NoticeView} from '@/features/notices/api'
import post from '../../assets/notices/20261030-economic-relics/notice.json'
import '@/index.css'
const notice:NoticeView={...post,category:'update',status:'published',pinned:false,starts_at:null,ends_at:null,author_id:null,created_at:'',updated_at:'',published_at:null,revision:0,urls:Object.fromEntries(post.images.map(path=>[path,'/assets/notices/20261030-economic-relics/'+path.split('/').at(-1)]))}
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:600,margin:'auto',padding:20}}><h1 className="mb-5 text-lg font-semibold">{post.title}</h1><NoticeBody notice={notice}/></main>)
