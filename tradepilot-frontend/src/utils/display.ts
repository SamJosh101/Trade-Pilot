// Presentation rounding only. Never used in financial calculations or writes.
export function displayDecimal(value:string|null|undefined,places=2,fixed=false){
 if(value==null||!/^[-]?[0-9]+(?:\.[0-9]+)?$/.test(value))return '—';
 const negative=value.startsWith('-'),[whole,fraction='']=value.replace(/^-/,'').split('.'),digits=BigInt(whole+fraction.padEnd(places,'0').slice(0,places))+(Number(fraction[places]??'0')>=5?1n:0n),padded=digits.toString().padStart(places+1,'0'),w=places?padded.slice(0,-places):padded,f=places?padded.slice(-places):'',suffix=fixed?f:f.replace(/0+$/,'');
 return `${negative&&digits!==0n?'-':''}${w.replace(/\B(?=(\d{3})+(?!\d))/g,',')}${suffix?'.'+suffix:''}`;
}
