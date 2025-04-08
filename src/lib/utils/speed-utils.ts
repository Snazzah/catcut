const generateTempoChangeCommand = (factor: number) => {
    factor = Math.max(Math.min(factor, 100000), 0.0001);
    const tempoMults = (()=>{if(factor > 1) {
        const pow2Repeats = Math.floor(Math.log2(factor));
        const lastFactor = factor / (Math.pow(2, pow2Repeats));
        return [...[...Array(pow2Repeats)].map(_=>2), lastFactor];
    } else if (factor < 1) {
        // I just guessed.
        const reciFactor = 1/factor;
        const pow2Repeats = Math.floor(Math.log2(reciFactor));
        const lastFactor = reciFactor / (Math.pow(2, pow2Repeats));
        return [...[...Array(pow2Repeats)].map(_=>0.5), 1/lastFactor];
    } else {
        return [];
    }})();
    return tempoMults.filter(v=>v!==1).map(v=>`atempo=${v}`).join(',');
};

export const generatePitchSpeedAudioCommand = (factorOfSpeed: number, preservePitch: boolean, changeInPitchIfPreserved: number): string => {
    factorOfSpeed = factorOfSpeed ?? 1;
    changeInPitchIfPreserved = changeInPitchIfPreserved ?? 0;


    if(factorOfSpeed === 1 && (!preservePitch || changeInPitchIfPreserved === 0)) {
        return '';
    }
    if(preservePitch) {
        const semitones = changeInPitchIfPreserved;
        if(semitones === 0) {
            console.log("BRANCH 1", semitones);
            return generateTempoChangeCommand(factorOfSpeed);
        } else {
            const fos2 = Math.pow(2, semitones/12); // change the factor of speed by this
            const c0 = `aresample=44100,asetrate=44100*${fos2},aresample=44100`;  // ,aresample=44100
            const c1 = generateTempoChangeCommand(factorOfSpeed / fos2);
            console.log("BRANCH 2", semitones);
            return [c0, c1].join(',');
        }
    } else {
        return `aresample=44100,asetrate=44100*${factorOfSpeed},aresample=44100`;
    }
};