// Copyright (c) 2015 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import UserStore from '../stores/user_store.jsx';
var Popover = ReactBootstrap.Popover;
var Overlay = ReactBootstrap.Overlay;
import * as Utils from '../utils/utils.jsx';
import Constants from '../utils/constants.jsx';

import ChannelStore from '../stores/channel_store.jsx';

export default class PopoverListMembers extends React.Component {
    constructor(props) {
        super(props);

        this.handleShowDirectChannel = this.handleShowDirectChannel.bind(this);
        this.closePopover = this.closePopover.bind(this);
    }

    componentWillMount() {
        this.setState({showPopover: false});
    }

    componentDidMount() {
        const originalLeave = $.fn.popover.Constructor.prototype.leave;
        $.fn.popover.Constructor.prototype.leave = function onLeave(obj) {
            let selfObj;
            if (obj instanceof this.constructor) {
                selfObj = obj;
            } else {
                selfObj = $(obj.currentTarget)[this.type](this.getDelegateOptions()).data(`bs.${this.type}`);
            }
            originalLeave.call(this, obj);

            if (obj.currentTarget && selfObj.$tip) {
                selfObj.$tip.one('mouseenter', function onMouseEnter() {
                    clearTimeout(selfObj.timeout);
                    selfObj.$tip.one('mouseleave', function onMouseLeave() {
                        $.fn.popover.Constructor.prototype.leave.call(selfObj, selfObj);
                    });
                });
            }
        };
    }

    componentDidUpdate() {
        $(ReactDOM.findDOMNode(this.refs.memebersPopover)).find('.popover-content').perfectScrollbar();
    }

    handleShowDirectChannel(teammate, e) {
        e.preventDefault();

        Utils.openDirectChannelToUser(
            teammate,
            (channel, channelAlreadyExisted) => {
                Utils.switchChannel(channel);
                if (channelAlreadyExisted) {
                    this.closePopover();
                }
            },
            () => {
                this.closePopover();
            }
        );
    }

    closePopover() {
        this.setState({showPopover: false});
    }

    render() {
        const popoverHtml = [];
        const members = this.props.members;
        const teamMembers = UserStore.getProfilesUsernameMap();
        const currentUserId = UserStore.getCurrentId();
        const ch = ChannelStore.getCurrent();

        if (members && teamMembers) {
            members.sort((a, b) => {
                const aName = Utils.displayUsername(a.id);
                const bName = Utils.displayUsername(b.id);

                return aName.localeCompare(bName);
            });

            members.forEach((m, i) => {
                let button = '';
                if (currentUserId !== m.id && m.offline !== true && ch.type !== 'D') {
                    button = (
                        <a
                            href='#'
                            className='btn-message'
                            onClick={(e) => this.handleShowDirectChannel(m, e)}
                        >
                            {'Message'}
                        </a>
                    );
                }

                let name = '';
                if (teamMembers[m.username]) {
                    name = Utils.displayUsername(teamMembers[m.username].id);
                }

                let styles = 'profile-img rounded pull-left';

                let iconWrapperStyle = {
                    'font-size': '29px',
                    cursor: 'default'
                };

                let iconStyle = {
                    'margin-top': '-1px'
                };

                let src = '/api/v1/users/' + m.id + '/image?time=' + m.update_at + '&' + Utils.getSessionIndex();
                let userIconElement = null;

                if (m.offline) {
                    userIconElement = (
                        <div
                            className={styles}
                            width='26px'
                            height='26px'
                            style={iconWrapperStyle}
                            title='This channel member is offline'
                        >
                            <span
                                className='fa fa-exclamation-circle'
                                style={iconStyle}
                            />
                        </div>
                    );
                } else {
                    userIconElement = (
                        <img
                            className={styles}
                            width='26px'
                            height='26px'
                            src={src}
                        />
                    );
                }

                if (name && teamMembers[m.username].delete_at <= 0) {
                    popoverHtml.push(
                        <div
                            className='text-nowrap'
                            key={'popover-member-' + i}
                        >
                            {userIconElement}
                            <div className='pull-left'>
                                <div
                                    className='more-name'
                                >
                                    {name}
                                </div>
                            </div>
                            <div
                                className='pull-right'
                            >
                                {button}
                            </div>
                        </div>
                    );
                }
            });
        }

        let count = {
            total: this.props.memberCount,
            online: 0,
            offline: 0
        };

        members.forEach((m) => {
            if (m.offline) {
                count.offline += 1;
            } else {
                count.online += 1;
            }
        });

        let countOfflineText = '/-';
        let countOnlineText = '-';

        // fall back to checking the length of the member list if the count isn't set
        if (!count.total && members) {
            count.total = members.length;
        }

        if (count.offline > Constants.MAX_CHANNEL_POPOVER_COUNT) {
            countOfflineText = ' (' + Constants.MAX_CHANNEL_POPOVER_COUNT + '+) ';
        } else if (count.offline > 0) {
            countOfflineText = ' (' + count.offline.toString() + ') ';
        }

        if (count.online > Constants.MAX_CHANNEL_POPOVER_COUNT) {
            countOnlineText = Constants.MAX_CHANNEL_POPOVER_COUNT + '+';
        } else if (count.online > 0) {
            countOnlineText = count.online.toString();
        }

        return (
            <div>
                <div
                    id='member_popover'
                    ref='member_popover_target'
                    onClick={(e) => this.setState({popoverTarget: e.target, showPopover: !this.state.showPopover})}
                >
                    <div>
                        <span
                            title='Online channel members'
                        >
                            {countOnlineText}
                        </span>
                        <span
                            title='Offline channel members'
                        >
                            {countOfflineText}
                        </span>
                        <span
                            className='fa fa-user'
                            aria-hidden='true'
                        />
                    </div>
                </div>
                <Overlay
                    rootClose={true}
                    onHide={this.closePopover}
                    show={this.state.showPopover}
                    target={() => this.state.popoverTarget}
                    placement='bottom'
                >
                    <Popover
                        ref='memebersPopover'
                        title='Members'
                        id='member-list-popover'
                    >
                        {popoverHtml}
                    </Popover>
                </Overlay>
            </div>
        );
    }
}

PopoverListMembers.propTypes = {
    members: React.PropTypes.array.isRequired,
    memberCount: React.PropTypes.number,
    channelId: React.PropTypes.string.isRequired
};
