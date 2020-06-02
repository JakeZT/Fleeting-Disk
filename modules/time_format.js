let getFormatTime=(Exat)=>{
  let date = new Date(Exat);
  Y = date.getFullYear() + '-';
  M = (date.getMonth()+1 < 10 ? '0'+(date.getMonth()+1) : date.getMonth()+1) + '-';
  D = date.getDate() + ' ';
  h = date.getHours() + ':';
  m = date.getMinutes() + ':';
  s = date.getSeconds(); 
  // return  SystemTime=`${Y}${M}${D}${h}${m}${s}`
  return  SystemTime=`${Y}${M}${D}`
}

    module.exports=getFormatTime;