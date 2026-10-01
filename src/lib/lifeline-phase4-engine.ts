export type StockItem={id:string;name:string;onHand:number;available:number;reorderPoint:number;unitCost:number};
export type JobCost={jobId:string;revenue:number;materials:number;labour:number;expenses:number};
export type StockMovement={productId:string;quantity:number;kind:"sale"|"refund"|"receipt"|"stocktake"|"job-use"};
const round=(n:number)=>Math.round((Number(n)||0)*100)/100;
export function applyStockMovement(item:StockItem,m:StockMovement):StockItem{
 if(item.id!==m.productId)return item;
 const delta=m.kind==="sale"||m.kind==="job-use"?-Math.abs(m.quantity):m.kind==="refund"||m.kind==="receipt"?Math.abs(m.quantity):m.quantity;
 const onHand=round(item.onHand+delta),available=round(item.available+delta);
 if(onHand<0||available<0)throw new Error("Insufficient stock");
 return{...item,onHand,available};
}
export function stocktake(item:StockItem,counted:number){const variance=round(counted-item.onHand);return{item:{...item,onHand:round(counted),available:round(Math.max(0,item.available+variance))},variance,varianceValue:round(variance*item.unitCost)}}
export function needsReorder(item:StockItem){return item.available<=item.reorderPoint}
export function jobProfitability(x:JobCost){const cost=round(x.materials+x.labour+x.expenses),profit=round(x.revenue-cost);return{cost,profit,marginPercent:x.revenue>0?round(profit/x.revenue*100):0}}
export type WorkflowStatus="quote"|"accepted"|"job"|"complete"|"invoiced"|"paid";
export function nextWorkflowStatus(s:WorkflowStatus):WorkflowStatus{const order:WorkflowStatus[]=["quote","accepted","job","complete","invoiced","paid"];return order[Math.min(order.length-1,order.indexOf(s)+1)]}
export function canInvoice(s:WorkflowStatus){return s==="complete"||s==="invoiced"||s==="paid"}
