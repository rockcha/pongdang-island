import type {FarmSimulation} from './farm-simulation'

// Read older saves without dropping an in-progress single research job.
export function farmResearchJobs(simulation:FarmSimulation){
 const jobs={...simulation.researchJobs}
 const legacy=simulation.researchJob
 if(legacy&&!jobs[legacy.labId])jobs[legacy.labId]=legacy
 return jobs
}
