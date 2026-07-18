import mongoose from 'mongoose';
import FinancialProfile from './models/FinancialProfile.js';

const URI = 'mongodb://127.0.0.1:27017/wealthgenie';
const USER_ID = '65b000000000000000000001';

async function seed() {
  await mongoose.connect(URI);
  console.log('Connected to DB');
  
  // Clean first
  await FinancialProfile.deleteMany({ userId: USER_ID });
  
  const profile = await FinancialProfile.create({
    userId: USER_ID,
    income: 80000,
    age: 30,
    savings: 20000,
    annualIncome: 960000,
    taxSlab: 0.1,
    effectiveTaxRate: 5.2,
    taxRegime: 'new',
    riskCategory: 'Moderate',
    riskScore: 50,
    riskDescription: 'Moderate risk',
    recommendedEquityAllocation: 50,
    investableAmount: 20000,
    investmentHorizon: 15,
    liquid_savings: 100000,
    existing_debt: 0,
    dependents: 0,
    emergency_fund_months: 6,
    risk_tolerance: 'Moderate',
    goal_type: 'wealth-building',
  });
  
  console.log('Seeded profile with ID:', profile._id.toString());
  await mongoose.disconnect();
}

seed().catch(console.error);
