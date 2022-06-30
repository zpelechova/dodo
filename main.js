const Apify = require('apify');

const {
    utils: { log, puppeteer, sleep },
} = Apify;

let access_token;

Apify.main(async () => {
    const { loginEmail, password, customerName, customerPhone, customerEmail, partnerId, price, paymentMethod, branchId, pickupRequiredEnd, pickupRequiredStart, pickupNote, addressRawValue, companyName, contactName, companyRegistrationNumber, floorNumber, dropNote, dropRequiredEnd, dropRequiredStart, proxy } = await Apify.getInput();
    const signinUrl = 'https://portal-dev.gaia.delivery/';
    const missionUrl = 'https://api-dev.gaia.delivery/portal/missions';
    const POST = 'POST';
    const testData = { customerName, customerPhone, customerEmail, partnerId, price, paymentMethod, pickup: { branchId, requiredEnd: pickupRequiredEnd, requiredStart: pickupRequiredStart, note: pickupNote }, drop: { addressRawValue, companyName, contactName, companyRegistrationNumber, floorNumber, note: dropNote, requiredEnd: dropRequiredEnd, requiredStart: dropRequiredStart } };
    const testDataCopy = { customerName: 'Name', customerPhone: '+420774967355', customerEmail: 'zuzka@apify.com', partnerId: 333, price: 0, paymentMethod: 'Online', pickup: { branchId: 9177, requiredEnd: '2022-07-08T14:49:00.000+02:00', requiredStart: '2022-07-07T14:49:00.000+02:00', note: 'note' }, drop: { addressRawValue: 'Švédská 1205/21, 150 00 Praha, Česko', companyName: 'Company name', contactName: 'Contact', companyRegistrationNumber: 'company IC', floorNumber: 'Floor number', note: 'drop note', requiredEnd: '2022-07-10T14:50:00.000+02:00', requiredStart: '2022-07-09T14:50:00.000+02:00' } };

    const requestList = await Apify.openRequestList('url', [signinUrl]);
    const proxyConfiguration = await Apify.createProxyConfiguration(proxy);

    const puppeteerCrawler = new Apify.PuppeteerCrawler({
        requestList,
        proxyConfiguration,
        handlePageFunction: async ({ page, request }) => {
            page.on('response', async (response) => {
                try {
                    if (
                        response.request().url()
                        !== 'https://idodo-dev.eu.auth0.com/oauth/token'
                    ) {
                        return;
                    }
                    const json = await response.json();
                    access_token = json.access_token;
                } catch (error) {
                    console.log('This was not the correct response.');
                }
            });
            await puppeteer.injectJQuery(page);

            log.info('Login page opened.', { url: request.url });
            log.info('Signing in...');

            await page.type('#username', loginEmail, { delay: 100 });
            await page.type('#password', password, { delay: 100 });
            // await page.waitForTimeout(5000);

            await page.evaluate(() => $('button:contains(Continue)').click());
            await page.waitForTimeout(20000);
            console.log(access_token);
            log.info('Signed in.');
        },
    });

    log.info('The process of signing in has started.');
    await puppeteerCrawler.run();
    log.info('The process of signing in has finished.');

    const cheerioCrawler = new Apify.CheerioCrawler({
        requestList: await Apify.openRequestList('missionUrl', [
            {
                url: missionUrl,
                method: POST,
                headers: {
                    authorization: `Bearer ${access_token}`,
                    'content-type': 'application/json',
                },
                payload: JSON.stringify(testData),
            },
        ]),
        proxyConfiguration,
        handlePageFunction() {},
        additionalMimeTypes: ['application/octet-stream'],
    });

    log.info('The process has started.');
    await cheerioCrawler.run();
    log.info('The process has finished.');
});
