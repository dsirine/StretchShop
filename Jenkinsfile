pipeline {
  agent any
  stages {
    stage('Cloning Git') {
      steps {
        git 'https://github.com/dsirine/StretchShop.git'
      }
    }
    stage('Build') {
       steps {
        sh 'ls'
        sh 'docker-compose up'
       }
    }
    stage('Test') {
      steps {
        sh 'docker-compose up'
      }
    }
  }
}
