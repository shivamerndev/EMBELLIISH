import api from '../api/axios';

const fetchLeadsService = async () => {
  const res = await api.get('/sales/leads');
  return res.data;
};


const getLeadService = async (id) => {
  const res = await api.get(`/sales/leads/${id}`);
  return res.data;
}

export { fetchLeadsService, getLeadService };
