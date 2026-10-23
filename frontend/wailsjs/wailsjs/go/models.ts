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
	export class UpdateInfo {
	    currentVersion: string;
	    latestVersion: string;
	    hasUpdate: boolean;
	    releaseName: string;
	    releaseNotes: string;
	    releaseDate: string;
	    downloadURL: string;
	    fileName: string;
	    fileSize: number;
	    htmlURL: string;
	    errorMessage?: string;
	
	    static createFrom(source: any = {}) {
	        return new UpdateInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.currentVersion = source["currentVersion"];
	        this.latestVersion = source["latestVersion"];
	        this.hasUpdate = source["hasUpdate"];
	        this.releaseName = source["releaseName"];
	        this.releaseNotes = source["releaseNotes"];
	        this.releaseDate = source["releaseDate"];
	        this.downloadURL = source["downloadURL"];
	        this.fileName = source["fileName"];
	        this.fileSize = source["fileSize"];
	        this.htmlURL = source["htmlURL"];
	        this.errorMessage = source["errorMessage"];
	    }
	}

}

