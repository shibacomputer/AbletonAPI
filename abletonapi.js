let Max4Node = require('max4node');

class AbletonAPI {
    constructor() {
        this.max = new Max4Node();
        this.max.bind();
    }

    /**
     * Plays a single scene
     * @param scene
     */
    playScene(scene) {
        this.fireMaxData('live_set scenes ' + scene);
    }

    /**
     * Retruns max data as promise
     * @param method
     * @param path
     * @param property
     * @returns {Promise}
     */
    getMaxData(method, path, property) {
        return new Promise((resolve, reject) => {
            let data = {
                path: path,
                property: property
            };

            switch (method) {
                case "get":
                    this.max.get(data).on('value', resolve);
                    break;
                case "count":
                    this.max.count(data).on('value', resolve);
                    break;
                default:
                    reject(null);
                    break;
            }
        });
    }

    /**
     * Sets max data
     * @param path
     * @param property
     * @param value
     */
    setMaxData(path, property, value) {
        let data = {
            path: path,
            property: property,
            value: value
        };

        this.max.set(data);
    };

    /**
     * Fires a cue or data point
     * @param path
     */
    fireMaxData(path) {
        this.max.call({
            path: path,
            method: 'fire'
        });
    }

    /**
     * Retruns an array with object data from Ableton
     * @param path
     * @param property
     * @param valuesToGet
     * @returns {Promise.<TResult>}
     */
    getMaxList(path, property, valuesToGet) {
        return this.getMaxData('count', path, property)
            .then((count) => {
                return new Promise((resolve, reject) => {
                    let data = [ ];
                    let promises = [ ];
                    for(let i = 0; i<count; i++) {
                        promises[i] = new Promise((resolve, reject) => {
                            let subpath = path + ' ' + property + ' ' + i;
                            let subpromises = [ ];
                            for(let y in valuesToGet) {
                                subpromises.push(this.getMaxData('get', subpath, valuesToGet[y]));
                            }

                            Promise.all(subpromises).then((values) => {
                                data[i] = { };
                                data[i].id = i;
                                for(let z in values) {
                                    data[i][valuesToGet[z]] = values[z];
                                }
                                resolve();
                            })
                        });
                    }
                    Promise.all(promises).then(() => {
                        resolve(data);
                    });
                });
            });
    };

    /**
     * Returns list of scenes in Ableton live with name and color
     * @returns {Promise.<TResult>}
     */
    getScenes() {
        return this.getMaxList('live_set', 'scenes', ['name', 'color']);
    }

    /**
     * Returns song tempo
     * @returns {Promise}
     */
    getTempo() {
        return this.getMaxData('get', 'live_set master_track mixer_device song_tempo', 'value');
    }

    /**
     * Sets song tempo
     * @param tempo
     */
    setTempo(tempo) {
        this.setMaxData('live_set master_track mixer_device song_tempo', 'value', tempo);
    }

    /**
     * Retruns list of all tracks
     * @returns {Promise.<TResult>}
     */
    getTracks() {
        return this.getMaxList('live_set', 'tracks', ['name']);
    }

    /**
     * Get devices for master track
     * @returns {Promise.<TResult>}
     */
    getDevicesForMasterTrack() {
        return this.getMaxList('live_set master_track', 'devices', ['name', 'type', 'class_name', 'can_have_drum_pads', 'can_have_chains'])
            .then((devices) => {
                return new Promise((resolve, reject) => {
                    let promises = [ ];
                    for(let i in devices) {
                        promises[i] = this.getParametersForDevice('master_track', i);
                    }

                    Promise.all(promises).then((values) => {
                        for(let y in values) {
                            devices[y]['Parameters'] = values[y];
                        }

                        resolve(devices);
                    });
                });
            });
    }

    /**
     * Returns list of devices for track
     * @param track
     * @returns {Promise.<TResult>}
     */
    getDevicesForTrack(track) {
        return this.getMaxList('live_set tracks ' + track, 'devices', ['name', 'type', 'class_name', 'can_have_drum_pads', 'can_have_chains'])
            .then((devices) => {
                return new Promise((resolve, reject) => {
                    let promises = [ ];
                    for(let i in devices) {
                        promises[i] = this.getParametersForDevice('master_track', i);
                    }

                    Promise.all(promises).then((values) => {
                        for(let y in values) {
                            devices[y]['Parameters'] = values[y];
                        }

                        resolve(devices);
                    });
                });
            });
    }

    /**
     * Returns parameters for device or master_track
     * @param track
     * @param device
     * @returns {Promise.<TResult>}
     */
    getParametersForDevice(track, device) {
        let device_values = [
            'default_value',
            'is_enabled',
            'is_quantized',
            'max',
            'min',
            'name',
            'original_name',
            'value'
        ];

        if(track === 'master_track') {
            return this.getMaxList('live_set master_track devices ' + device, 'parameters', device_values);
        } else {
            return this.getMaxList('live_set tracks ' + track + ' devices ' + device, 'parameters', device_values);
        }
    }
}

module.exports = new AbletonAPI();