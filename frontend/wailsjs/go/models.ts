export namespace main {
	
	export class Config {
	    IP: string;
	    Username: string;
	
	    static createFrom(source: any = {}) {
	        return new Config(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.IP = source["IP"];
	        this.Username = source["Username"];
	    }
	}

}

