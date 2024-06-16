const initDashcard = async (dashcardId, dascardName, dashcardDataKey, icon, link, action) => {
    console.debug("initDashcard", dashcardId, dascardName, dashcardDataKey, icon, link, action)

    $(dashcardId + '-name').text(dascardName)

    const iconElement = $(dashcardId + '-icon');
    iconElement.removeClass(); 
    iconElement.addClass('fa-3x card-icon');

    if (icon === "chart") {
        iconElement.addClass('fas fa-chart-simple');
    } else if (icon === "warning") {
        iconElement.addClass('fas fa-exclamation-triangle text-warning');
    } else if (icon === "satoshi") {
        iconElement.addClass('fas fa-bolt-lightning text-warning');
    } else if (icon === "doughnut") {
        const iconContainer = $(dashcardId + '-icon-container');
        iconContainer.append('<div id="' + dashcardDataKey + '-doughnut"></div>');
    }

    $(dashcardId + '-reload-button').on('click', async function() {
        console.debug(`Reload button clicked for dashcard ${dashcardId}`);
        await refresDashcard(dashcardId, dashcardDataKey, action);
    });

    await refresDashcard(dashcardId, dashcardDataKey, action)

}

const refresDashcard = async(dashcardId, dashcardDataKey, action) => {

    console.debug("refresDashcard", dashcardId, dashcardDataKey, action)
    const data = await fetchDashcardData(dashcardDataKey, action)
    $(dashcardId + '-text').text(data.total)

}

const fetchDashcardData = async (dashcardDataKey, action) => {
    console.debug("fetchDashcardData", dashcardDataKey, action)

    let serverData  = ""

    await fetch(`http://localhost:3000/api/v2/admin/modulecountdata?module=${dashcardDataKey}&action=${action}`
        , {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authkey}`,
            }}
        )
            .then(response => response.json())
            .then(data => {
                authkey = data.authkey;
                serverData = data;
            })
            .catch(error => console.error('Error:', error));

            return serverData || { total: 0 }

}

// Set the data for the dashcards
let dashcards =[
    { dashcardId: '#nostraddressCount',  dataKey: 'nostraddress', icon: 'doughnut', dashcardName: 'Registered users', link: '#nostraddressData', action: 'count' },
    { dashcardId: '#mediaCount', dataKey: 'media', icon: 'doughnut', dashcardName: 'Media files', link: '#mediaData' , action: 'count' },
    { dashcardId: '#lightningCount', dataKey: 'lightning', icon: 'chart', dashcardName: 'Lightning redirects', link: '#lightningData', action: 'count' },
    { dashcardId: '#domainsCount', dataKey: 'domains', icon: 'chart', dashcardName: 'Domains', link: '#domainsData', action: 'count' },
    { dashcardId: '#logHistory', dataKey: 'logger', icon: 'warning', dashcardName: 'Warning messages', link: 'settings/#settingsLogger', action: 'countWarning' },
    { dashcardId: '#paymentsCount', dataKey: 'payments', icon: 'doughnut', dashcardName: 'Transactions', link: '#paymentsData', action: 'count' },
    { dashcardId: '#unpaidTransactionsBalance', dataKey: 'payments', icon: 'satoshi', dashcardName: 'Unpaid transactions balance', link: '#paymentsData', action: 'unpaidTransactions' },
    { dashcardId: '#serverBalance', dataKey: 'payments', icon: 'satoshi', dashcardName: 'Server balance', link: '', action: 'serverBalance' },
]

const refreshDashcards = async () => {
    console.debug("refreshDashcards")
    for (const dashcard of dashcards) {
        await refresDashcard(dashcard.dashcardId, dashcard.dataKey,  dashcard.action)
    }
}