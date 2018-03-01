'use strict';

import Logger from './Logger';

const logger = new Logger('utils');

module.exports =
{
	initialize()
	{
		logger.debug('initialize()');

		return Promise.resolve();
	},

	isDesktop()
	{
		return true;
	},

	isMobile()
	{
		return false;
	}
};
