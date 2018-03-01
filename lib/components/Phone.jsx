'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import CopyToClipboard from 'react-copy-to-clipboard';
import IconMenu from 'material-ui/IconMenu';
import MenuItem from 'material-ui/MenuItem';
import IconButton from 'material-ui/IconButton/IconButton';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';
import qiyu from 'qiyuconnect';
import UrlParse from 'url-parse';
import Logger from '../Logger';
import audioPlayer from '../audioPlayer';
import TransitionAppear from './TransitionAppear';
import Logo from './Logo';
import Dialer from './Dialer';
import Session from './Session';
import Incoming from './Incoming';

const callstatsjssip = window.callstatsjssip;

const logger = new Logger('Phone');

export default class Phone extends React.Component
{
	constructor(props)
	{
		super(props);

		this.state =
		{
			// 'connecting' / disconnected' / 'connected' / 'registered'
			status          : 'disconnected',
			session         : null,
			incomingSession : null
		};

		// Mounted flag
		this._mounted = false;
		// Site URL
		this._u = new UrlParse(window.location.href, true);
	}

	render()
	{
		let state = this.state;
		let props = this.props;
		let invitationLink = `${this._u.protocol}//${this._u.host}${this._u.pathname}?callme=${props.settings.uri}`;

		return (
			<TransitionAppear duration={1000}>
				<div data-component='Phone'>
					<header>
						<div className='topbar'>
							<Logo
								size='small'
							/>

							<IconMenu
								iconButtonElement={
									<IconButton>
										<MoreVertIcon color='#fff'/>
									</IconButton>
								}
								anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
								targetOrigin={{ horizontal: 'right', vertical: 'top' }}
							>
								<CopyToClipboard text={invitationLink}
									onCopy={this.handleMenuCopyInvitationLink.bind(this)}
								>
									<MenuItem
										primaryText='Copy invitation link'
									/>
								</CopyToClipboard>
								<CopyToClipboard text={props.settings.uri || ''}
									onCopy={this.handleMenuCopyUri.bind(this)}
								>
									<MenuItem
										primaryText='Copy my SIP URI'
									/>
								</CopyToClipboard>
								<MenuItem
									primaryText='Exit'
									onClick={this.handleMenuExit.bind(this)}
								/>
							</IconMenu>
						</div>

						<Dialer
							settings={props.settings}
							status={state.status}
							busy={!!state.session || !!state.incomingSession}
							callme={this._u.query.callme}
							onCall={this.handleOutgoingCall.bind(this)}
						/>
					</header>

					<div className='content'>
						{state.session ?
							<Session
								session={state.session}
								onNotify={props.onNotify}
								onHideNotification={props.onHideNotification}
							/>
						:
							null
						}

						{state.incomingSession ?
							<Incoming
								session={state.incomingSession}
								onAnswer={this.handleAnswerIncoming.bind(this)}
								onReject={this.handleRejectIncoming.bind(this)}
							/>
						:
							null
						}
					</div>
				</div>
			</TransitionAppear>
		);
	}

	componentDidMount()
	{
		this._mounted = true;

		let settings = this.props.settings;
		let callback = (...args) => {
			if(!this._mounted) return;
			var type = args[0],
				data = args[1];
			switch (type) {
				case 'connecting':
					logger.debug('UA "connecting" event');
					this.setState({
						uri    : qiyu.ua.configuration.uri.toString(),
						status : 'connecting'
					});
					break;
				case 'connected':
					logger.debug('UA "connected" event');
					this.setState({ status: 'connected' });
					break;
				case 'disconnected':
					logger.debug('UA "disconnected" event');
					this.setState({ status: 'disconnected' });
					break;
				case 'registered':
					logger.debug('UA "registered" event');
					this.setState({ status: 'registered' });
					break;
				case 'unregistered':
					logger.debug('UA "unregistered" event');
					if (qiyu.ua.isConnected())
						this.setState({ status: 'connected' });
					else
						this.setState({ status: 'disconnected' });
					break;
				case 'registrationFailed':
					logger.debug('UA "registrationFailed" event');
					if (qiyu.ua.isConnected())
						this.setState({ status: 'connected' });
					else
						this.setState({ status: 'disconnected' });
					this.props.onNotify(
							{
								level   : 'error',
								title   : 'Registration failed',
								message : data.cause
							});
					break;
				case 'newRTCSession': {
					if (data.originator === 'local')
						return;
					logger.debug('UA "newRTCSession" event');
					let state = this.state;
					let session = data.session;

					// Avoid if busy or other incoming
					if (state.session || state.incomingSession) {
						logger.debug('incoming call replied with 486 "Busy Here"');

						session.terminate(
							{
								status_code   : 486,
								reason_phrase : 'Busy Here'
							});

						return;
					}

					audioPlayer.play('ringing');
					this.setState({ incomingSession: session });

					session.on('failed', () =>
					{
						audioPlayer.stop('ringing');
						this.setState(
							{
								session         : null,
								incomingSession : null
							});
					});
					session.on('ended', () =>
					{
						this.setState(
							{
								session         : null,
								incomingSession : null
							});
					});
					session.on('accepted', () =>
					{
						audioPlayer.stop('ringing');
						this.setState(
							{
								session         : session,
								incomingSession : null
							});
					});
					break;
				}

			}
		};

		try
		{
			qiyu.login({
					url: settings.socket.uri,
					ua: {
						uri                 : settings.uri,
						password            : settings.password,
						display_name        : settings.display_name,
						registrar_server    : settings.registrar_server,
						contact_uri         : settings.contact_uri,
						authorization_user  : settings.authorization_user,
						instance_id         : settings.instance_id,
						session_timers      : settings.session_timers,
						use_preloaded_route : settings.use_preloaded_route
					},
					callback: callback,
					extraHeaders: ['App-ID: '+ settings.app_id]
				});
		}
		catch (error)
		{
			this.props.onNotify(
				{
					level   : 'error',
					title   : 'Wrong JsSIP.UA settings',
					message : error.message
				});

			this.props.onExit();
			return;
		}

		// Set callstats stuff
		if (settings.callstats.enabled)
		{
			callstatsjssip(
				// JsSIP.UA instance
				qiyu.ua,
				// AppID
				settings.callstats.AppID,
				// AppSecret
				// 'zAWooDtrYJPo:OeNNdLBBk7nOq9mCS5qbxOhuzt6IdCvnx3cjNGj2tBo='
				settings.callstats.AppSecret
			);
		}

	}

	componentWillUnmount()
	{
		this._mounted = false;
	}

	handleMenuCopyInvitationLink()
	{
		logger.debug('handleMenuCopyInvitationLink()');

		let message = 'Invitation link copied to the clipboard';

		this.props.onShowSnackbar(message, 3000);
	}

	handleMenuCopyUri()
	{
		logger.debug('handleMenuCopyUri()');

		let message = 'Your SIP URI copied to the clipboard';

		this.props.onShowSnackbar(message, 3000);
	}

	handleMenuExit()
	{
		logger.debug('handleMenuExit()');

		qiyu.ua.stop();
		this.props.onExit();
	}

	handleOutgoingCall(uri)
	{
		logger.debug('handleOutgoingCall() [uri:"%s"]', uri);

		let session = qiyu.ua.call(uri,
			{
				pcConfig : this.props.settings.pcConfig || { iceServers: [] },
				mediaConstraints :
				{
					audio : true,
					video : true
				},
				rtcOfferConstraints :
				{
					offerToReceiveAudio : 1,
					offerToReceiveVideo : 1
				}
			});

		session.on('connecting', () =>
		{
			this.setState({ session });
		});

		session.on('progress', () =>
		{
			audioPlayer.play('ringback');
		});

		session.on('failed', (data) =>
		{
			audioPlayer.stop('ringback');
			audioPlayer.play('rejected');
			this.setState({ session: null });

			this.props.onNotify(
				{
					level   : 'error',
					title   : 'Call failed',
					message : data.cause
				});
		});

		session.on('ended', () =>
		{
			audioPlayer.stop('ringback');
			this.setState({ session: null });
		});

		session.on('accepted', () =>
		{
			audioPlayer.stop('ringback');
			audioPlayer.play('answered');
		});
	}

	handleAnswerIncoming()
	{
		logger.debug('handleAnswerIncoming()');
		qiyu.answer(this.state.incomingSession, {
				pcConfig : this.props.settings.pcConfig || { iceServers: [] }
			});
	}

	handleRejectIncoming()
	{
		logger.debug('handleRejectIncoming()');
		qiyu.bye(this.state.session);
	}
}

Phone.propTypes =
{
	settings           : PropTypes.object.isRequired,
	onNotify           : PropTypes.func.isRequired,
	onHideNotification : PropTypes.func.isRequired,
	onShowSnackbar     : PropTypes.func.isRequired,
	onHideSnackbar     : PropTypes.func.isRequired,
	onExit             : PropTypes.func.isRequired
};
