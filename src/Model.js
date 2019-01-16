import GraphParser from "./GraphParser"

export default class Model {

  static defaults = {}

  constructor(attributes) {
    if (attributes && attributes.__typename) {
      Object.assign(this, attributes)
    } else {
      Object.assign(this, this.constructor.defaults, attributes)
    }
  }

  /**
   * Setup Apollo Provider and pre-load all models
   * 
   * @param {apolloProvider} options 
   */
  static setup(options) {

    // Pre-load all models
    let models = []
    let r = require.context('@/models', true, /\.js$/)
    r.keys().forEach(key => models[key.replace(/(\.\/|\.js)/g, "")] = r(key).default)

    Model.$models = models

    // Override default $query option to transform response into Models
    options.apolloProvider.defaultOptions = {
      $query: {
        update: (data) => {
          return GraphParser.map(Object.entries(data)[0][1], Model.$models)

        },
      }
    }

    Model.$apollo = options.apolloProvider.defaultClient
  }

  get $apollo() {
    return Model.$apollo
  }

  get $models() {
    return Model.$models
  }

  primaryKey() {
    return 'id'
  }

  getPrimaryKey() {
    return this[this.primaryKey()]
  }

  hasId() {
    const id = this.getPrimaryKey()
    return this.isValidId(id)
  }

  isValidId(id) {
    return id !== undefined && id !== 0 && id !== '' && id !== null
  }

  static async find(id) {
    let response = await this.$apollo.query({
      query: this.FIND_QUERY,
      variables: {
        id
      }
    })

    return GraphParser.map(Object.entries(response.data)[0][1], this.$models)
  }

  static async all(variables = {}) {
    let response = await this.$apollo.query({
      query: this.ALL_QUERY,
      variables
    })

    return GraphParser.map(Object.entries(response.data)[0][1], this.$models)
  }

  static async query(query, variables, options) {
    let response = await this.$apollo.query({
      query,
      variables,
    })

    return GraphParser.map(Object.entries(response.data)[0][1], this.$models)
  }


  async save() {
    try {
      // TODO exception if methods are not implemented on BaseModel
      let operation = this.hasId() ? this.UPDATE_MUTATION() : this.CREATE_MUTATION()

      let response = await this.$apollo.mutate({
        mutation: operation.mutation,
        variables: operation.variables
      })

      let object = {}
      Object.assign(object, Object.entries(response.data)[0][1])
      let graph = GraphParser.map(object, this.$models)
      Object.assign(this, {}, graph)

      return graph

    } catch (error) {
      console.log({ error })
      throw this.convertError(error)
    }
  }

  async delete() {
    try {
      const operation = this.DELETE_MUTATION()

      await this.$apollo.mutate({
        mutation: operation.mutation,
        variables: operation.variables
      })

    } catch (error) {
      throw this.convertError(error)
    }
  }

  convertError(error) {
    let exception = {}

    exception.message = error.graphQLErrors[0].message

    if (error.graphQLErrors[0].validation) {
      exception.errors = Object.assign({}, error.graphQLErrors[0].validation)
    }

    return exception
  }
}