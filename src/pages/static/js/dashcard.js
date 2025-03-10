const initDashcard = async (dashcardId, dascardName, dashcardDataKey, icon, link, action, field) => {

    $('#' + dashcardId + '-name').text(dascardName)

    const iconElement = $('#' + dashcardId + '-icon');
    iconElement.removeClass(); 
    iconElement.addClass('fa-3x card-icon');

    if (icon === "chart") {
        iconElement.addClass('fas fa-chart-simple');
    } else if (icon === "warning") {
        iconElement.addClass('fas fa-exclamation-triangle text-warning');
    } else if (icon === "satoshi") {
        iconElement.addClass('fas fa-bolt-lightning text-warning');
    } else if (icon === "doughnut") {
        const iconContainer = $('#' + dashcardId + '-icon-container');
        iconContainer.append('<canvas style="border 1px solid black" id="' + dashcardId + '-doughnut-chart" width="50" height="50"></canvas>');
    } else if (icon === "time") {
        iconElement.addClass('fas fa-clock text-info');
    }

    $('#' + dashcardId + '-reload-button').on('click', async function() {
        semaphore.execute(async() => await refreshDashcard(dashcardId, dashcardDataKey, action, field));
    });

    semaphore.execute(async () => await refreshDashcard(dashcardId, dashcardDataKey, action, field));
}

const refreshDashcard = async(dashcardId, dashcardDataKey, action, field) => {

    $('#' + dashcardId + '-tooltip-text').addClass('visible');
    $('#' + dashcardId + '-tooltip-text').text('Retrieving data...');

    const countData = await fetchDashcardData(dashcardDataKey, action, field)
    console.log('countData', countData)
    $('#' + dashcardId + '-text').text(countData.total)
    if (field !== "" && field !== undefined) {
        initDoughnutChart(dashcardId, dashcardDataKey, {field: countData.field, total: countData.total}, field, false, false, true)
    }
    setTimeout(() => {
        $('#' + dashcardId + '-tooltip-text').removeClass('visible');
    }, 1000);
}

const fetchDashcardData = async (dashcardDataKey, action, field) => {

    if (dashcardDataKey === 'admin' && action === 'uptime') {
        const uptime = await fetchServerUptime()
        console.log('uptime', uptime)
        return { total: uptime, field: uptime}
    }

    let serverData  = ""

    await fetch(`admin/modulecountdata?module=${dashcardDataKey}&action=${action}&field=${field}`
        , {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }}
        )
            .then(response => response.json())
            .then(data => {
                serverData = data;
            })
            .catch(error => console.error('Error:', error));

            return serverData || { total: 0 }

}

// Set the data for the dashcards
let dashcards =[
    { dashcardId: 'nostraddressCount',  dataKey: 'nostraddress', icon: 'doughnut', dashcardName: 'Registered users', link: '#nostraddressData', action: 'count', field: 'checked' },
    { dashcardId: 'mediaCount', dataKey: 'media', icon: 'doughnut', dashcardName: 'Hosted files', link: '#mediaData' , action: 'count', field: 'checked'},
    { dashcardId: 'lightningCount', dataKey: 'lightning', icon: 'chart', dashcardName: 'Lightning redirects', link: '#lightningData', action: 'count'},
    { dashcardId: 'domainsCount', dataKey: 'domains', icon: 'chart', dashcardName: 'Domains', link: '#domainsData', action: 'count'},
    { dashcardId: 'logHistory', dataKey: 'logger', icon: 'warning', dashcardName: 'Warning messages', link: 'settings/#settingsLogger', action: 'countWarning' },
    { dashcardId: 'paymentsCount', dataKey: 'payments', icon: 'doughnut', dashcardName: 'Transactions', link: '#paymentsData', action: 'count', field: 'paid'},
    { dashcardId: 'unpaidTransactionsBalance', dataKey: 'payments', icon: 'satoshi', dashcardName: 'Unpaid transactions balance', link: '#paymentsData', action: 'unpaidTransactions' },
    { dashcardId: 'serverBalance', dataKey: 'payments', icon: 'satoshi', dashcardName: 'Server balance', link: '', action: 'serverBalance' },
    { dashcardId: 'serverUptime', dataKey: 'admin', icon: 'time', dashcardName: 'Server uptime', link: '', action: 'uptime' },
]

const refreshDashcards = async () => {
    for (const dashcard of dashcards) {
        if (activeModules.includes(dashcard.dataKey)) {
            semaphore.execute(async() => await refreshDashcard(dashcard.dashcardId, dashcard.dataKey,  dashcard.action, dashcard.field))
        }
    }
}

const fetchServerUptime = async ()  =>{

    let uptime = "00:00";

    await fetch('admin/status')
    .then(res => res.json())
    .then(out =>
      {
        const timeParts = out.uptime.split(':');
        if (timeParts.length === 3) {
            uptime = `${timeParts[0]}:${timeParts[1]}`;
        }
    })
    .catch(err => { 
        console.warn(err)
        return "00:00";
    });

    return uptime
}