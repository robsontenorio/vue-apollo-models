import GraphParser from "./GraphParser"

export default class Model {

  static defaults = {}

  constructor(attributes) {
    if (attributes && attributes.__typename) {
      Object.assign(this, attributes)
    } else {
      Object.assign(this, this.constructor.defaults, attributes)
    }
    delete this.__typename
  }

  /**
   * Setup Apollo Provider and pre-load all models
   * 
   * @param {apolloProvider} options 
   */
  static setup (options) {

    // Pre-load all models
    let models = []
    let r = require.context('@/models', true, /\.js$/)

    r.keys().forEach(key => models[r(key).default.name] = r(key).default)

    Model.$models = models

    // Override default $query option to transform response into Models
    options.apolloProvider.defaultOptions = {
      $query: {
        update: (data) => {
          console.log('via query')
          let graph = Object.assign({}, Object.entries(data)[0][1])
          return GraphParser.map(graph, Model.$models)
        },
      }
    }

    // // make a copy from defaultClient
    // let defaultClient = {}
    // Object.assign(defaultClient, {}, options.apolloProvider.defaultClient)

    // // override mutate() 
    // options.apolloProvider.defaultClient.mutate = (options) => {
    //   console.log('via mutate')
    //   return defaultClient.mutate(options)
    // }

    Model.$apollo = options.apolloProvider.defaultClient
  }

  get $apollo () {
    return Model.$apollo
  }

  get $models () {
    return Model.$models
  }

  primaryKey () {
    return 'id'
  }

  getPrimaryKey () {
    return this[this.primaryKey()]
  }

  hasId () {
    const id = this.getPrimaryKey()
    return this.isValidId(id)
  }

  isValidId (id) {
    return id !== undefined && id !== 0 && id !== '' && id !== null
  }

  async save () {
    try {
      // TODO exception if methods are not implemented on BaseModel
      let operation = this.hasId() ? this.UPDATE_MUTATION() : this.CREATE_MUTATION()

      let response = await this.$apollo.mutate({
        mutation: operation.mutation,
        variables: operation.variables
      })
      console.log('reposta da mutation')
      let object = {}

      Object.assign(object, Object.entries(response.data)[0][1])

      console.log(object)

      let graph = GraphParser.map(object, this.$models)

      // console.log({ ...graph })

      this.hasId() ? Object.assign(this, {}, { ...graph }) : Object.assign(this, {}, { ...graph })

      console.log('resposta do graph convertido')
      console.log(graph)

      // Object.assign(this, ...graph)

      console.log('objeto final')
      console.log(this)

      return graph

    } catch (error) {
      console.log({ error })
      throw this.convertError(error)
    }
  }

  async delete () {
    try {
      const operation = this.deleteMutation()

      await this.$apollo.mutate({
        mutation: operation.mutation,
        variables: operation.variables
      })

    } catch (error) {
      throw this.convertError(error)
    }
  }

  convertError (error) {
    let exception = {}

    exception.message = error.graphQLErrors[0].message

    if (error.graphQLErrors[0].validation) {
      exception.errors = Object.assign({}, error.graphQLErrors[0].validation)
    }

    return exception
  }
}