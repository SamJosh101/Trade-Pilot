import AdvancedTradeList from './AdvancedTradeList';
import type {Trade} from '../types/trade';
export default function StrategyTradeList(props:{accountId:string;onTradeClick:(t:Trade)=>void;onDelete:(id:string)=>void}){return <AdvancedTradeList {...props} strategyOnly/>;}
