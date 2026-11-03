export function canUseTrainingLab(operator:boolean,email?:string,development=import.meta.env.DEV){
 return development&&operator&&email?.toLowerCase()==='0@0.com'
}
