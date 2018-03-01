'use strict';

import domready from 'domready';
import React from 'react';
import ReactDOM from 'react-dom';
import Logger from './Logger';
import utils from './utils';

import App from './components/App';

const EventEmitter = require('events').EventEmitter;
const logger = new Logger();

module.exports = class CCToolBar extends EventEmitter {
    constructor(configuration) {
        logger.debug('new() [configuration:%o]', configuration);
        super();
    }
};

domready(() => {
    logger.debug('DOM ready');

    // Load stuff and run
    utils.initialize().then(run).catch((error) => {
        console.error(error);
    });
});



function run() {
    logger.debug('run() [environment:%s]', process.env.NODE_ENV);

    let container = document.getElementById('cc-toolbar-container');

    ReactDOM.render(<App/>, container);
}
