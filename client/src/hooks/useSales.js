import { useDispatch } from "react-redux"
import { fetchLeadsService, getLeadService } from "../services/sales.service"
import { setLeads, setCurrentLead } from "../features/sales/sales.slice"

const useSales = () => {
    const dispatch = useDispatch()

    const handleFetchLeads = async () => {
        const res = await fetchLeadsService()
        dispatch(setLeads(res))
        return res
    }

    const handleGetLead = async (leadId)=>{
        const res = await getLeadService(leadId)
        dispatch(setCurrentLead(res))
        return res
    }


    return { handleFetchLeads,handleGetLead }
}

export default useSales