export default class GraphParser {
  constructor(graph, models) {
    this.graph = graph
    this.models = models
  }

  static map(graph, models) {
    return new this(graph, models).parse(graph)
  }

  parse(graph) {
    Object.entries(graph).forEach(([key, value]) => {
      graph[key] = this.parseEntry(value)
    })

    let object = graph.__typename !== undefined ? this.parseModel(graph) : graph

    delete object.__typename

    return object
  }

  parseEntry(value) {
    if (value instanceof Object && !Array.isArray(value)) {
      return this.parse(value)
    }

    if (Array.isArray(value)) {
      return this.parseCollection(value)
    }

    if (value.__typename !== undefined) {
      return this.parseModel(value)
    }

    return value
  }

  parseCollection(collection) {
    let coll = []
    collection.forEach((item) => {
      if (item instanceof Object) {
        coll.push(this.parse(item))
      }
    })

    return coll
  }

  parseModel(attributes) {
    const model = this.models[attributes.__typename]

    try {
      let object = new model(attributes)
      delete object.__typename
      return object
    } catch (e) {
      // console.warn('Model not found: ' + attributes.__typename)
      return attributes
    }
  }
}