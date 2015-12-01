# react-props
inject props to react component for high performance rendering

# 为什么要用 react-props ?

## 单向数据流拖垮 virtual-dom 的性能

react 的 virtual-dom 性能不错，但是也扛不住层级过深的单向数据流。在大型复杂 Web 应用中，如果轻微的数据改动都将带来全局自上而下的 `Component#render` 与 `diff 计算`，不可能做到 16ms 渲染一帧的性能要求。因此，react 有 `shouldComponentUpdate` 生命周期方法，可以减少 render 与 diff 计算的成本。

## 当前解决方案要么太繁琐，要么侵入性强

`shouldComponentUpdate` 并不足够有用，对两个 object 做深度对比的代价，在 javascript 里依然是昂贵的。所以，又存在新工具 `immutableJS`，使用它所提供的数据操作 api，我们得到了可以简单地用 `===` 来高效对比两个 object 的便利。

用 `immutableJS` 也有代价，它是侵入性的。我们得部分抛弃原生数据操作的 api，改用 `immutableJS` 所提供的。这需要付出额外的心智成本，以分辨一个数据是原生的，还是 `immutable` 的。

## 「惰性计算」与「局部更新」是更好的策略

在各种 flux 实现中，与 react 的对接方式大多是： `onStateChange` 当全局状态发生改动时(不管改动量多大)，`mapStateToProps` 函数将全局状态换算为 `Root` 组件的 `props`，该 props 常常很庞大，因为它包含了传递到子孙组件的所有数据量；然后从 `Root` 组件开始，全局更新。

新的思路是：`onAction` 拿到 action 数据，调用 `match` 函数，通过其 action.type 锁定要更新的组件，然后调用指定的 `stateToProps` 将 props 注入该组件，调用 forceUpdate 方法，局部更新。

与旧有方式相比，有三个改动点：

- `mapStateToProps` 不局限于根组件，而是针对每个需要局部更新的组件而设计多个，做数据拆分。
- `match` 函数，根据输入的 action 数据，返回需要更新的组件列表
- `actionHandler` 侦听 action，调用 match，触发局部更新。

# demo

[todomvc](http://isomorphism-react-todomvc.coding.io/)

查看控制台，每个组件的 render 与 shouldComponentUpdate 方法都打上了 log，可以触发各个 action 体验局部更新的效果。

todomvc 的大多数 action 都需要全局更新，只有修改 todo.text 和 filter 切换需要局部更新。

# 安装 react-props

```shell
npm install --save react-props
```

# 使用方法


## 第1步：编写 selector

selector 的作用是从 global state 中取出一份数据，合并到 react 组件的 props 属性。

selector 函数前三个参数为固定的。

- state: 全局 state 数据
- actions: flux 的 actions 函数集
- props: 父组件传递过来的初始 props

```javascript
// selectors.js
export let NewTodo = (state, actions, props) => {
	return actions
}

export let Main = (state, actions, props) => {
	let { todos } = state
	return {
		...actions,
		isAllCompleted: !!todos.length && todos.every(item => item.status),
	}
}

// Todo 组件有很多个，通过父组件传递的 id 来匹配
export let Todo = (state, actions, props) => {
	let todo = state.todos.filter(todo => todo.id === props.id)[0]
	let { deleteItem, updateItem } = actions 
	return {
		updateItem,
		deleteItem,
		...todo
	}
}

// 父组件 Todos 不需要为 todo 准备所有数据，提供 id 即可
export let Todos = (state, actions, props) => {
	let { activeFilter } = state
	let todos = state.todos.filter(todo => {
		switch (activeFilter) {
			case 'SHOW_ALL':
			return true

			case 'SHOW_ACTIVE':
			return !todo.status

			case 'SHOW_COMPLETED':
			return todo.status
		}
	}).map(todo => todo.id)
	return {
		...actions,
		todos
	}
}

export let Filters = (state, actions, props) => {
	let { todos, activeFilter } = state
	let todoCount = todos.filter(item => !item.status).length
	activeFilter = activeFilter || 'SHOW_ALL'
	return {
		...actions,
		activeFilter,
		todoCount,
		completedCount: todos.length - todoCount
	}
}
```


## 第2步：使用 injectProps

`injectProps(selectorName)`，当不穿 selectorName 参数时，默认以 Component.name 为 selectorName。

```javascript
import React, { Component, PropTypes } from 'react'
import Todo from './Todo'
import { injectProps } from 'react-props'

@injectProps()
export default class Todos extends React.Component {
	static propTypes = {
		todos: PropTypes.arrayOf(PropTypes.number.isRequired)
	}
	render() {
		console.log('Todos rendering')
		let { todos } = this.props
		return <ul id="todo-list">{
			todos.map(id =>
				<Todo id={ id } key={ id } /> // 只传 id
			)
		}</ul>
	}
}
```

## 第三步，去掉相关父组件手动传 props 的做法

对于使用了 injectProps 装饰符的组件，其 props 可以通过 selector 直接注入，所以父组件可以不传或者少传 props。

```javascript
import React, { Component, PropTypes } from 'react'
import NewTodo from '../components/NewTodo'
import Main from '../components/Main'
import Filters from '../components/Filters'
import { injectProps } from 'react-props'

@injectProps()
export default class Root extends Component {
	render() {
		return (<div>
					<NewTodo /> // 裸组件
					<Main id="main" /> // 或者只传关键属性
					<Filters />
				</div>)
	}
}
```

## 第四步，编写 match 函数

match 函数响应 action 调用，返回需要更新的 selectorName

```javascript
import * as FilterTypes from '../constants/FilterTypes'
import * as ActionTypes from '../constants/ActionTypes'
import { API_TODOS } from '../constants/API'
import { SERVER_UPDATE } from '../constants/SocketTypes'

let matcher = data => {
	let { action, state, nextState } = data // redux 的 action 数据
	switch (true) {
		case FilterTypes.hasOwnProperty(action.type):
			return ['Filters', 'Todos']
		case action.type === ActionTypes.UPDATE_ITEM:
			return matchItem(action.data)
		case action.type === SERVER_UPDATE:
			return handleWebSocket(action)
		default:
			return 'Root'
	}
}

export default matcher

let matchItem = ({ id, text }) => {
	// 没有 text 属性，说明更新的是其他字段，需要全局渲染
	if (!text) {
		return 'Root'
	}
	let callback = component => {
		// 通过 id 匹配需要更新的 component 手动更新
		if (component.props.id === id) {
			component.forceUpdate()
		}
	}
	// 当 match 函数返回 obj 时，它会将 name 所对应的 component 依次传入 callback
	return {
		name: 'Todo',
		callback
	}
}
```

## 第五步，设置 flux 配置

flux 配置让 react-props 能拿到必要的数据。

`setFluxConfig` 接受一个 object 参数，必须有四个属性：getState actions selectors match。

```javascript
import { createStore, combineReducers, applyMiddleware, bindActionCreators } from 'redux'
import { bindReducer, setFluxConfig } from 'react-props'
import * as actionCreators from '../actions'
import reducer from '../reducer'
import * as selectors from './selectors'
import match from './match'

export default initialState => {
	let store = createStore(bindReducer(reducer), initialState)
	let { dispatch, getState } = store
	let actions = bindActionCreators(actionCreators, store.dispatch)
	setFluxConfig({
		getState,
		actions,
		selectors,
		match
	})
	return store
}
```

`bindReducer` 是 `react-props` 专门为 `redux` 设计的侦听 `action` 的函数。

由于 redux 的 store，没有 onAction 方法，subscribe 方法只是 onstatechange，所以通过 bindReducer 可以拿到 action state nextState 三种数据。

其实 bindReducer 内部调用的是 `handleAction`。如果你想手动处理，也可以像下面那样：

```javascript
import { handleAction } from 'react-props'

let data = {
	type: 'ADD_TODO',
	text: 'text for todo'
}

handleAction(data) // match 函数将拿到这个 data
```

此外，不需要再做什么，视图会根据 match 函数的返回值做局部更新(当更新范围为 Root 组件时，也就相当于全局更新).

# 欢迎提 issue 和 PR

