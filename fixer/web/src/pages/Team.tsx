import { useEffect,useState } from 'react';
import { api } from '../api/client';
export default function Team(){const [text,setText]=useState('');useEffect(()=>{api.developers().then(v=>setText(JSON.stringify(v,null,2))).catch(e=>setText(String(e)));},[]);return <main className="p-6"><h1>Команда · демонстраційні розробники</h1><pre className="whitespace-pre-wrap">{text}</pre><p>TODO Олег: модулі, autoDispatch, метрики.</p></main>;}
