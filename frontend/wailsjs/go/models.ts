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
	export class Port {
	    portNum: number;
	    processTitle: string;
	    faviconPath: string;
	    protocol: string;
	
	    static createFrom(source: any = {}) {
	        return new Port(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.portNum = source["portNum"];
	        this.processTitle = source["processTitle"];
	        this.faviconPath = source["faviconPath"];
	        this.protocol = source["protocol"];
	    }
	}

}

