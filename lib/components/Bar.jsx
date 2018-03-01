'use strict';

import React from 'react';

import Icon from 'antd/lib/icon';

import Popover from 'antd/lib/popover';



export default class Bar extends React.Component
{
	constructor(props)
	{
		super(props);
	}

	render()
	{
            return (
    			<Popover placement='bottom' title={'title'} content={'content'} trigger='click'>
                    <Icon type='phone'/>
                </Popover>
    		);
	}
}
