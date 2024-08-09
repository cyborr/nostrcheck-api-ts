import { Event } from "nostr-tools"
import { relays, relaysPool } from "./core.js";
import app from "../../app.js";
import { logger } from "../logger.js";

/**
 * Retrieves the profile data of a user from the Nostr network (Kind 0).
 * @param pubkey - The public key of the user, hex format.
 * @returns A promise that resolves to the content data of the kind 0 note.
 */
const getProfileData = async (pubkey: string, kind: number = 0): Promise<Event[]> => {
    let resolveEvents: (events: Event[]) => void;
    let subscribePromise: Promise<Event[]> = new Promise(resolve => resolveEvents = resolve);
    
    const events: Event[] = [];
    const data = relaysPool.subscribeMany(
        relays,
        [{
            authors: [pubkey],
            kinds: [kind],
			since: Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60)
        }],
        {
            eoseTimeout: 100,
            onevent(e) {
                events.push(e);
            },
            oneose() {
                data.close();
                resolveEvents(events.length ? events : [{kind: 0, created_at: 0, tags: [], content: "{}", pubkey: "", id: "", sig: ""}]);
            },
        },
    );

    let resultEvents: Event[] = await subscribePromise;
    if (resultEvents.length === 0) {
        return [{kind: 0, created_at: 0, tags: [], content: "{}", pubkey: "", id: "", sig: ""}];
    }

    return resultEvents;
}

/**
 * Retrieves the followers of a user from relays (Kind 3). Asynchronously updates the app state with the number of followers.
 * @param pubkey - The public key of the user, hex format.
 * @returns A boolean indicating whether the operation was successful.
 */
const getProfileFollowers = (pubkey : string) : Boolean => {
	
	let followerList : Event[] = []


	try{
		const data = relaysPool.subscribeMany(
			relays,
			[{
				kinds: [3],
				"#p": [pubkey],
			}],
			{
				eoseTimeout: 100,
				onevent(e) {
					followerList.push(e);
				},
				oneose() {
					data.close();
					app.set("#p_" + pubkey, followerList.length);
				},
			},
		);
	}catch (error) {
		logger.error(error)
		return false
	}
	
	return true;
}

const getProfileFollowing = (pubkey : string) : Boolean => {
	
	let followingList = []


	try{
		const data = relaysPool.subscribeMany(
			relays,
			[{
				authors: [pubkey],
				kinds: [3],
			}],
			{
				eoseTimeout: 100,
				onevent(e) {
					for (let tag of e.tags) {
                        followingList.push(tag);
                    }
				},
				oneose() {
					data.close();
					app.set("#f_" + pubkey, followingList.length);
				},
			},
		);
	}catch (error) {
		logger.error(error)
		return false
	}
	
	return true;
}

export {getProfileData, getProfileFollowers, getProfileFollowing}