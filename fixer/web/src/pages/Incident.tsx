import { useEffect, useState } from 'react';
import { api, USE_MOCKS } from '../api/client';
import type { Incident as Data } from '../api/types';
export default function Incident(){
 const [data,setData]=useState<Data>();const [error,setError]=useState('');
 useEffect(()=>{api.getIncident(12).then(setData).catch(e=>setError(String(e)));},[]);
 return <main className="p-6 max-w-6xl mx-auto"><h1 className="text-2xl font-bold">Fixer · AI-тріаж логів</h1><p className="my-4">Скелет · {USE_MOCKS?'локальні моки':'Java API'} · демонстраційна картка, відправку ще не підключено</p><p role="alert">{error}</p>{data && <><h2>{data.diagnosis?.category} · {data.status}</h2><p>{data.diagnosis?.rootCause}</p><div className="grid md:grid-cols-2 gap-4 my-4"><pre className="bg-white p-4 whitespace-pre-wrap break-words">{data.rawLog}</pre><pre className="bg-white p-4 whitespace-pre-wrap break-words">{JSON.stringify({evidence:data.diagnosis?.evidence,candidates:data.candidates,task:data.task},null,2)}</pre></div><button disabled>Confirm / Dismiss — TODO</button></>}</main>;
}
