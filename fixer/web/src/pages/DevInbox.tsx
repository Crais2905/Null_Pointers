import { useEffect,useState } from 'react';
import { api } from '../api/client';
export default function DevInbox(){const [text,setText]=useState('');useEffect(()=>{api.tasks('dev-1').then(v=>setText(JSON.stringify(v,null,2))).catch(e=>setText(String(e)));},[]);return <main className="p-6"><h1>Inbox · демо dev-1</h1><pre className="whitespace-pre-wrap">{text}</pre><p>TODO Олег: вибір дева, Ack/Done, Markdown.</p></main>;}
