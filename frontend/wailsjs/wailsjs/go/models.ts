export namespace main {
	
	export class OpenProjectResult {
	    filePath: string;
	    content: string;
	
	    static createFrom(source: any = {}) {
	        return new OpenProjectResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filePath = source["filePath"];
	        this.content = source["content"];
	    }
	}
	export class PanelsConfigResult {
	    filePath: string;
	    content: string;
	
	    static createFrom(source: any = {}) {
	        return new PanelsConfigResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filePath = source["filePath"];
	        this.content = source["content"];
	    }
	}

}

