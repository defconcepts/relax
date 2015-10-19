import React, {cloneElement, PropTypes} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import {Component, mergeFragments, buildQueryAndVariables} from 'relax-framework';

import * as adminActions from '../../client/actions/admin';
import {getQueryVariables} from '../../decorators/query-props';
import Admin from '../../components/admin';
import panels from '../../components/admin/panels';

@connect(
  (state) => ({
    user: state.session.data,
    display: state.display
  }),
  (dispatch) => bindActionCreators(adminActions, dispatch)
)
export default class AdminContainer extends Component {
  static fragments = Admin.fragments

  static propTypes = {
    activePanelType: PropTypes.string,
    children: PropTypes.any,
    location: PropTypes.object.isRequired,
    params: PropTypes.object.isRequired,
    slug: PropTypes.string,
    getAdmin: PropTypes.func.isRequired,
    updatePage: PropTypes.func.isRequired,
    display: PropTypes.string.isRequired
  }

  getInitialState (props = this.props) {
    return {
      loading: true,
      ...props.children.type.panelSettings
    };
  }

  componentWillReceiveProps (nextProps) {
    const params = nextProps.children.type.panelSettings;

    if (params.activePanelType !== this.state.activePanelType ||
        params.slug !== this.state.slug) {
      this.setState({
        loading: true,
        ...params
      }, () => {
        this.fetchData(nextProps);
      });
    }
  }

  static getQueryAndVariables (props, state) {
    const {activePanelType} = state;
    const panel = panels[activePanelType];
    const vars = {};

    const panelFragments = Object.assign({}, panel.fragments);

    // This probably could be encapsulated somehow
    switch (activePanelType) {
      case 'pages':
        vars[activePanelType] = {
          ...props.queryVariables || getQueryVariables(panels.pages.defaultQuery)
        };
        break;
      case 'fonts':
      case 'settings':
        vars.settings = {
          ids: {
            value: panel.settings,
            type: '[String]!'
          }
        };
        break;
      case 'page':
      case 'menu':
        if (props.params && props.params.slug !== 'new') {
          vars[activePanelType] = {
            slug: {
              value: props.params && props.params.slug,
              type: 'String!'
            }
          };
        } else {
          panelFragments[activePanelType] && delete panelFragments[activePanelType];
        }
        break;
      case 'menus':
        vars[activePanelType] = {
          ...props.queryVariables || getQueryVariables(panels.menus.defaultQuery)
        };
        break;
      case 'userEdit':
        vars.user = {
          username: {
            value: props.params && props.params.username,
            type: 'String!'
          }
        };
        break;
      default:
    }

    return buildQueryAndVariables(
      mergeFragments(
        this.fragments,
        panelFragments
      ),
      vars
    );
  }

  fetchData (props) {
    props
      .getAdmin(this.constructor.getQueryAndVariables(props, this.state))
      .done(() => {
        this.setState({
          loading: false
        });
      });
  }

  updatePage (data) {
    const panel = panels[this.state.activePanelType];
    const pageFragments = mergeFragments(
      this.constructor.fragments,
      panel.fragments
    );
    return this.props.updatePage(pageFragments, data);
  }

  render () {
    return (
      <Admin {...this.props} {...this.props.params} {...this.state}>
        {cloneElement(this.props.children, {
          ...this.props,
          ...this.props.params,
          ...this.state,
          ref: 'panel'
        })}
      </Admin>
    );
  }
}