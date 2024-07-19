import { connect, dbMultiSelect } from "./database.js";
import { logger } from "./logger.js";


const getAvailableDomains = async (): Promise<string[]> => {

	const domains = await dbMultiSelect(["domain"], "domains","1=1",[""],false);
	if (domains.length == 0) {return [];}
	return domains.map((row) => row.domain);
};

const getAvailiableUsers = async (domain:string): Promise<JSON[]> => {

	const users = await dbMultiSelect(["username", "hex"], "registered","domain = ?",[domain],false);
	if (users.length == 0) {return [];}

	return users;

};

export { getAvailableDomains, getAvailiableUsers };