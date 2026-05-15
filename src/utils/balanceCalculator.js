exports.calculateBalances = (expenses, members) => {
  const balanceMap = {};

  members.forEach(member => {
    balanceMap[member._id.toString()] = {
      userId: member._id.toString(),
      name: member.name,
      email: member.email,
      totalPaid: 0,
      totalOwed: 0,
      netBalance: 0,
      owesTo: {},
      owedBy: {}
    };
  });

  expenses.forEach(expense => {
    const payerId = expense.paidBy._id.toString();
    const amount = expense.amount;
    const perPersonAmount = expense.perPersonAmount;

    if (balanceMap[payerId]) {
      balanceMap[payerId].totalPaid += amount;
    }

    expense.splitBetween.forEach(person => {
      const personId = person._id.toString();

      if (personId !== payerId) {
        if (balanceMap[personId]) {
          balanceMap[personId].totalOwed += perPersonAmount;

          if (!balanceMap[personId].owesTo[payerId]) {
            balanceMap[personId].owesTo[payerId] = {
              userId: payerId,
              name: expense.paidBy.name,
              email: expense.paidBy.email,
              amount: 0
            };
          }
          balanceMap[personId].owesTo[payerId].amount += perPersonAmount;
        }

        if (balanceMap[payerId]) {
          if (!balanceMap[payerId].owedBy[personId]) {
            balanceMap[payerId].owedBy[personId] = {
              userId: personId,
              name: person.name,
              email: person.email,
              amount: 0
            };
          }
          balanceMap[payerId].owedBy[personId].amount += perPersonAmount;
        }
      } else {
        if (balanceMap[payerId]) {
          balanceMap[payerId].totalOwed += perPersonAmount;
        }
      }
    });
  });

  const balances = Object.values(balanceMap);

  balances.forEach(balance => {
    balance.netBalance = balance.totalPaid - balance.totalOwed;

    Object.keys(balance.owesTo).forEach(creditorId => {
      if (balance.owedBy[creditorId]) {
      const owesToCreditor = balance.owesTo[creditorId].amount;
        const owedByCreditor = balance.owedBy[creditorId].amount;
        
        if (owesToCreditor > owedByCreditor) {
          balance.owesTo[creditorId].amount = owesToCreditor - owedByCreditor;
        delete balance.owedBy[creditorId];
        } else if (owedByCreditor > owesToCreditor) {
          balance.owedBy[creditorId].amount = owedByCreditor - owesToCreditor;
             delete balance.owesTo[creditorId];
      } else {
        delete balance.owesTo[creditorId];
        delete balance.owedBy[creditorId];
      }
      }
    });

    balance.owesTo = Object.values(balance.owesTo);
    balance.owedBy = Object.values(balance.owedBy);
  });

  const summary = {
    totalExpenses: expenses.reduce((sum, exp) => sum + exp.amount, 0),
    expenseCount: expenses.length,
    balances: balances
  };
  console.log(summary,'summary');
  

  return summary;
};
