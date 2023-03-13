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
        '''
        
       }
    }
    stage('Test') {
      steps {
        sh 'docker-compose up'
      }
    }
  }
}
