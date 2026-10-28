import {Link} from 'react-router-dom';
import {useAccounts} from '../context/AccountContext';

export default function AccountScope(){
 const {activeAccount,accounts,isLoading,error,fetchAccounts}=useAccounts();
 if(error)return <div role="alert" className="notice error account-scope-error">{error}. Account information could not be refreshed.<button className="button" onClick={()=>void fetchAccounts()}>Retry accounts</button></div>;
 return <aside className="account-scope" aria-label="Selected trading account" aria-live="polite">
  <div><span>Selected trading account</span><strong>{activeAccount?.name??(isLoading?'Loading accounts…':'No trading account selected')}</strong></div>
  {isLoading?<span role="status">Updating account…</span>:!accounts.length?<Link to="/accounts">Create an account →</Link>:<span>Journal views use this account</span>}
 </aside>;
}
