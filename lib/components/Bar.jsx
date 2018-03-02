'use strict';

import React from 'react';

import Icon from 'antd/lib/Icon';

import Popover from 'antd/lib/popover';

const text = <span>Title</span>;
const content = (
  <div>
    <p>Content</p>
    <p>Content</p>
  </div>
);

export default class Bar extends React.Component
{
	constructor(props)
	{
		super(props);
	}

	render()
	{
            return (
    			<Popover placement='bottom' title={text} content={content} trigger='click'>
                    <Icon type='phone'/>
                </Popover>
    		);
	}
}
