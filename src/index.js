import React from 'react'

let isType = type => obj => obj != null && Object.prototype.toString.call(obj) === `[object ${ type }]`
let isObj = isType('Object')
let isStr = isType('String')
let isFn = isType('Function')
let isArr = Array.isArray || isType('Array')

// state
let $getState = () => {}
let $actions = {}
let $selectors = {}
let $components = {}
let $match

export let setFluxConfig = ({ getState, selectors, actions, match }) => {
	addSelectors(selectors)
	$getState = getState
	$actions = actions
	$match = match
}

export let handleAction = data => {
	if (!isFn($match)) {
		return
	}
	let result = $match(data)
	switch (true) {
		case isObj(result):
			let { name, callback } = result
			if (isArr(name)) {
				name.forEach(item = eachComponent(item, callback))
			} else {
				eachComponent(name, callback)
			}
			break
		case isStr(result):
			renderCompoent(result)
			break
		case isArr(result):
			result.forEach(renderCompoent)
			break
	}
}

export let updater = {
	DID_UPDATE: data => {
		handleAction(data)
		return data
	} 
}

export let bindReducer = reducer => (state, action) => {
	let nextState = reducer(state, action)
	let $$getState = $getState
	$getState = () => nextState
	handleAction({
		state,
		nextState,
		action
	})
	$getState = $$getState
	return nextState
}

// selector
let addSelectors = obj => {
	Object.keys(obj).forEach(key => {
		let query = obj[key]
		if (!isFn(query)) {
			return
		}
		$selectors[key] = (props, ...args) => {
			let state = $getState()
			return query(state, $actions, props, ...args)
		}
	})
}


let addComponent = (name, component) => {
	if (!isArr($components[name])) {
		$components[name] = []
	}
	$components[name].push(component)
}

let removeComponent = (name, component) => {
	let components = $components[name]
	if (!isArr(components)) {
		return
	}
	let index = components.indexOf(component)
	if (index !== -1) {
		components.splice(index, 1)
	}
}

let getComponents = name => {
	let components = $components[name]
	return isArr(components) ? components : []
}

let eachComponent = (name, fn) => {
	getComponents(name).forEach(fn)
}

let forceUpdate = component => component.forceUpdate()
let renderCompoent = name => {
	getComponents(name).forEach(forceUpdate)
}

export let injectProps = (name, ...args) => Component => {
	name = name || Component.name
	class Injector extends React.Component {
		componentDidMount() {
			addComponent(name, this)
		}
		componentWillUnmount() {
			removeComponent(name, this)
		}
		render() {
			let selector = $selectors[name]
			let props = {}
			if (isFn(selector)) {
				props = selector(this.props, ...args)
			}
			return <Component {...this.props} {...props} />
		}
	}
	Object.defineProperties(Injector, {
		propTypes: {
			set(propTypes) {
				Component.propTypes = propTypes
			}
		},
		defaultProps: {
			set(defaultProps) {
				Component.defaultProps = defaultProps
			}
		}
	})
	return Injector
}