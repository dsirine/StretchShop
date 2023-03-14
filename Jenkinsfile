pipeline {
  agent any
  stages {
    stage('Cloning Git') {
      steps {
        git 'https://github.com/dsirine/StretchShop.git'
      }
    }
    stage('Verify tooling') {
       steps {
        sh '''
          docker version
          docker info
          docker compose version
          curl --version
          jq --version
        '''  
       }
    }
    stage('Start containers') {
      steps {
        sh 'docker-compose up'
      }
    }
    stage('Run tests again the container') {
      steps {
        sh 'curl http://localhost:3000/param?query=demo | jq'
      }
    }
  }
}
