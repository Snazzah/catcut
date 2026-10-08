import {
	ADTS,
	FLAC,
	MATROSKA,
	MP3,
	MP4,
	MPEG_TS,
	OGG,
	QTFF,
	WAVE,
	WEBM,
	AdtsOutputFormat,
	FlacOutputFormat,
	MkvOutputFormat,
	MovOutputFormat,
	Mp3OutputFormat,
	Mp4OutputFormat,
	MpegTsOutputFormat,
	OggOutputFormat,
	WavOutputFormat,
	WebMOutputFormat,
	type InputFormat,
	type OutputFormat
} from 'mediabunny';

export const exportFormats = [
	{ id: 'mp4', label: 'MP4', format: Mp4OutputFormat },
	{ id: 'mov', label: 'MOV', format: MovOutputFormat },
	{ id: 'webm', label: 'WebM', format: WebMOutputFormat },
	{ id: 'mkv', label: 'MKV', format: MkvOutputFormat },
	{ id: 'mp3', label: 'MP3', format: Mp3OutputFormat },
	{ id: 'wav', label: 'WAV', format: WavOutputFormat },
	{ id: 'ogg', label: 'OGG', format: OggOutputFormat },
	{ id: 'flac', label: 'FLAC', format: FlacOutputFormat },
	{ id: 'aac', label: 'AAC', format: AdtsOutputFormat },
	{ id: 'ts', label: 'MPEG-TS', format: MpegTsOutputFormat }
] as const;

export type ExportFormatId = (typeof exportFormats)[number]['id'];

export function getMatchingOutputFormat(inputFormat: InputFormat): OutputFormat | null {
	switch (inputFormat) {
		case MP4:
			return new Mp4OutputFormat();
		case QTFF:
			return new MovOutputFormat();
		case WEBM:
			return new WebMOutputFormat();
		case MATROSKA:
			return new MkvOutputFormat();
		case MP3:
			return new Mp3OutputFormat();
		case WAVE:
			return new WavOutputFormat();
		case OGG:
			return new OggOutputFormat();
		case FLAC:
			return new FlacOutputFormat();
		case ADTS:
			return new AdtsOutputFormat();
		case MPEG_TS:
			return new MpegTsOutputFormat();
		default:
			return null;
	}
}

export function getExportExtension(format: OutputFormat, filename: string): `.${string}` {
	const extension = filename.match(/\.[^.]+$/)?.[0].toLowerCase();
	if (format instanceof Mp4OutputFormat && (extension === '.m4a' || extension === '.m4v')) {
		return extension;
	}
	if (format instanceof OggOutputFormat && (extension === '.oga' || extension === '.ogv')) {
		return extension;
	}
	if (format instanceof MpegTsOutputFormat && (extension === '.mts' || extension === '.m2ts')) {
		return extension;
	}
	return format.fileExtension as `.${string}`;
}
