// https://github.com/getAlby/js-sdk
// https://github.com/getAlby/js-lightning-tools
// https://github.com/getAlby/js-sdk/tree/master/examples/nwc
// https://github.com/nostr-protocol/nips/blob/master/47.md

import { emptyInvoice, invoice } from "../../interfaces/payments.js";
import app from "../../app.js";
import { logger } from "../logger.js";
import { nwc as NWC } from "@getalby/sdk";
import WebSocket from 'ws'
global.WebSocket = WebSocket as any;

const nwc = new NWC.NWCClient({
    nostrWalletConnectUrl: `${app.get("config.payments")["paymentProviders"]["nwc"]["url"]}`,
});

const generateNwcInvoice = async (LNAddress: string, amount:number) : Promise<invoice> => {

    if (LNAddress == "" || amount == 0) return emptyInvoice;

    try{

        const response = await nwc.makeInvoice({amount: amount * 1000, description: ""});

        if (!response || response == undefined || response.invoice == "") {
            logger.error("Error checking invoice status");
        };
    
        return {paymentRequest: response.invoice, 
                paymentHash: response.payment_hash, 
                satoshi: response.amount, 
                isPaid: false, 
                preimage: "",
                createdDate: new Date(response.created_at).toISOString().slice(0, 19).replace('T', ' '),
                expiryDate: new Date(response.expires_at).toISOString().slice(0, 19).replace('T', ' '),
                paidDate: "", 
                description: response.description, 
                transactionid: 0, 
                accountid: 0};
        
    }catch(e){
        logger.error("Error generating nwc invoice", e);
        return emptyInvoice;
    }

}

const isInvoicePaidNwc = async (paymentHash: string): Promise<{ paiddate: string; preimage: string }> => {

    if (paymentHash === "") return { paiddate: "", preimage: "" };

    const maxRetries = 3;
    const emptyResponse = { paiddate: "", preimage: "" };
    type LookupInvoiceResponse = Awaited<ReturnType<typeof nwc.lookupInvoice>>;

    const lookupWithRetry = async (retries: number): Promise<{ paiddate: string, preimage: string }> => {
        while (retries > 0) {
            try {
                const invoice = await nwc.lookupInvoice({ payment_hash: paymentHash });
                if (invoice && invoice.preimage && invoice.preimage !== "null") {
                    return { paiddate: invoice.settled_at.toString(), preimage: invoice.preimage };
                }
                return emptyResponse;
            } catch (e: any) {
                if (e.message && e.message.includes("timeout")) {
                    logger.debug(`Timeout checking nwc invoice status for paymentHash: ${paymentHash}. Retries left: ${retries - 1}`);
                } else {
                    logger.error(`Error checking nwc invoice status for paymentHash: ${paymentHash}`, e.message);
                    break;
                }
            }
            retries--;
        }
        logger.debug("Max retries reached checking nwc invoice status for paymentHash: ", paymentHash);
        return emptyResponse;
    };

    return await lookupWithRetry(maxRetries);
    
};

export { isInvoicePaidNwc, generateNwcInvoice };